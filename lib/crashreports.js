/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const DATA = require("sdk/self").data;
const TIMERS = require("sdk/timers");
const SYSTEM = require("sdk/system");
const FILE = require("sdk/io/file");
const FS = require("sdk/io/fs");
const PAGEWORKERS = require("sdk/page-worker");
const SIMPLE_STORAGE = require("sdk/simple-storage");

const SCRIPT4CRASH_PAGE = DATA.url("script4crashpage.js");
const SCRIPT4BUG_PAGE = DATA.url("script4bugpage.js");
const CRASH_REGEX = /(\S+)\s(\S+)\s(\S+)\s(.+)$/;
const BUG_REGEX = /(\S+)\s(.+)/;
const DATE_REGEX = /(\d\d\d\d)-(\d\d)-(\d\d)\s(\d\d):(\d\d)/;
const { defer,all } = require('sdk/core/promise');
if (!SIMPLE_STORAGE.storage.crash_report_list) {
  SIMPLE_STORAGE.storage.crash_report_list = [];
}

const crash_report_list = SIMPLE_STORAGE.storage.crash_report_list;
for (let i = 0, n = crash_report_list.length; i < n; i++) {
  let crashReport = crash_report_list[i];
  crashReport.createdDate = new Date(crashReport.createdDate);
  if (crashReport.lastUpdatedDate) {
    crashReport.lastUpdatedDate = new Date(crashReport.lastUpdatedDate);
  }
  let relatedBugs = crashReport.relatedBugs;
  for (let j = 0, m = relatedBugs.length; j < m; j++) {  
    relatedBugs[j].lastUpdatedDate = new Date(relatedBugs[j].lastUpdatedDate);
  }
}
let is_loading = false;

const loadBugzilla = function(relatedBug) {  
  let deferred = defer();
//  let bugzillaURL = "https://api-dev.bugzilla.mozilla.org/latest/bug/"+relatedBug.id;
  let bugzillaURL = "https://bugzilla.mozilla.org/show_bug.cgi?id="+relatedBug.id;
  PAGEWORKERS.Page({
    contentURL: bugzillaURL,
    contentScriptFile: [SCRIPT4BUG_PAGE],
    contentScriptWhen: "end",
    onMessage :function(message) {
      let lines = message.split("\n");
      let lastUpdatedString = lines[0];
      let result4date = DATE_REGEX.exec(lastUpdatedString);
      let year = parseInt(result4date[1]);
      let month = parseInt(result4date[2])-1;
      let date = parseInt(result4date[3]);
      let hours = parseInt(result4date[4]);
      let minutes = parseInt(result4date[5]);
      let lastUpdatedDate = new Date(Date.UTC(year, month, date, hours, minutes));
      relatedBug.lastUpdatedDate = lastUpdatedDate;
      for (let i = 1, n = lines.length; i < n; i++) {
        let line = lines[i];
        if (line.length == 0) {
          continue;
        }
        let result = BUG_REGEX.exec(line);
        let imageURL = result[1];
        let userName = result[2];
        let exists = false;
        for (let j = 0, m = relatedBug.users.length; j < m; j++) {
          if (relatedBug.users[j].userName == userName) {
            exists = true;
            break;
          }
        }
        if (exists == false) {
          relatedBug.users.push({userName:userName, imageURL:imageURL});
        }
      }
      return deferred.resolve();
    }
  }).on("error", function(e) {
    console.log(e);
  });
  return deferred.promise;
}

const loadCrashReport = function(id, createdDate) {  
  let deferred = defer();
  let crashReportURL = "https://crash-stats.mozilla.com/report/index/" + id;
  let crashReport = null;
  for (let i = 0, n = crash_report_list.length; i < n; i++) {
    if (crash_report_list[i].id == id) {
      crashReport = crash_report_list[i];
      break;
    }
  }
  if (!crashReport) {
    crashReport = {};
    crashReport.id = id;
    crashReport.url = crashReportURL;
    crashReport.relatedBugs = [];
    crash_report_list.push(crashReport);
  } else {
    if (crashReport.relatedBugs.length != 0 && crashReport.totalBugResolved == crashReport.relatedBugs.length) {
      deferred.resolve();
      return;
    }
    if (crashReport.isNotFound == true) {
      deferred.resolve();
      return;
    }
  }
  crashReport.createdDate = createdDate;
  crashReport.totalBugResolved = 0;

  PAGEWORKERS.Page({
    contentURL: crashReportURL,
    contentScriptFile: [SCRIPT4CRASH_PAGE],
    contentScriptWhen: "end",
    onMessage :function(message) {
      let lines = message.split("\n");
      let notfoundORarchive = lines.length == 0;
      if (notfoundORarchive == true) {
        deferred.resolve();
        return;
      }
      crashReport.title = lines[0];
      crashReport.isNotFound = crashReport.title == "Crash Not Found";
      if (crashReport.isNotFound == true) {
        deferred.resolve();
        return;
      }
      let transactions = [];
      for (let i = 1, n = lines.length; i < n; i++) {
        let line = lines[i];
        let result = CRASH_REGEX.exec(line);
        let bugid = result[1];
        let status = result[2];
        let resolution = result[3];
        let summary = result[4];
        let isResolved = status == "RESOLVED" || status == "VERIFIED";
        let relatedBug = null;
        for (let j = 0, m = crashReport.relatedBugs.length; j < m; j++) {
          if (bugid == crashReport.relatedBugs[j].id) {
            relatedBug = crashReport.relatedBugs[j];
            break;
          }
        }
        if (!relatedBug) {
          relatedBug = {id:bugid};
          crashReport.relatedBugs.push(relatedBug);
        }
        if (isResolved == true) {
          crashReport.totalBugResolved += 1;
        }

        relatedBug.status = status;
        relatedBug.resolution = resolution;
        relatedBug.summary = summary;
        relatedBug.isResolved = isResolved;
        if (!relatedBug.users) {
          relatedBug.users = [];
        }
        let promise = loadBugzilla(relatedBug);
        transactions.push(promise);
      }

      all(transactions).then(function (result) {
        for (let i = 0, n = crashReport.relatedBugs.length; i < n; i++) {
          let relatedBug = crashReport.relatedBugs[i];
          if (relatedBug.lastUpdatedDate && (!crashReport.lastUpdatedDate || crashReport.lastUpdatedDate < relatedBug.lastUpdatedDate)) {
            crashReport.lastUpdatedDate = relatedBug.lastUpdatedDate;
          }
        }
        deferred.resolve();
      }, function (reason) {
        deferred.resolve();
      });
    }
  }).on("error", function(e) {
    console.log(e);
  });

  return deferred.promise;
}

let update_listener = null;

const loadCrashReports = function() {
  is_loading = true;
  update_listener.start();

  let transactions = [];
  //@see http://mxr.mozilla.org/mozilla-central/source/toolkit/crashreporter/CrashSubmit.jsm
  let path = FILE.join(SYSTEM.pathFor('UAppData'), "Crash Reports", "submitted");
  if(FILE.exists(path)) {
    let list = FILE.list(path);
    for (let i = list.length - 1; i >= 0; i--) {
      let logPath = FILE.join(path, list[i]);
      if(FILE.exists(logPath)) {

        let stats = new FS.Stats(logPath);
        let createdDate = new Date(stats.mtime);

        let crashID = FILE.read(logPath).trim();
        let indexOfColon = crashID.indexOf(":");
        crashID = crashID.substring(indexOfColon+2);
        let promise = loadCrashReport(crashID, createdDate);
        transactions.push(promise);
      } else {
        console.log("Failed:: Find Log File");
      }
    }
  } else {
    console.log("Failed:: Find Crash Reports Directory");
  }
  all(transactions).then(function (result) {
    crash_report_list.sort(function(c1, c2) {
      return c1.createdDate > c2.createdDate;
    });
    crash_report_list.sort(function(c1, c2) {
      if (!c1.lastUpdatedDate) {
        return 1;
      }
      if (!c2.lastUpdatedDate) {
        return -1;
      }
      return c1.lastUpdatedDate < c2.lastUpdatedDate;
    });
    is_loading = false;
    update_listener.end();
    TIMERS.setTimeout(loadCrashReports, 120*60*1000);
    return result;
  }, function (reason) {
    is_loading = false;
    update_listener.end();
    TIMERS.setTimeout(loadCrashReports, 120*60*1000);
    return reason;
  });
}

exports.getCrashReports = function() {
  return crash_report_list;
}

exports.isLoading = function() {
  return is_loading;
};

exports.load = function() {
  loadCrashReports();
}

exports.setUpdateListener = function(listener) {
  update_listener = listener;
}