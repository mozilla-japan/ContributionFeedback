/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const DATA = require("sdk/self").data;
const SYSTEM = require("sdk/system");
const FILE = require("sdk/io/file");
const FS = require("sdk/io/fs");
const PAGEWORKERS = require("sdk/page-worker");
const SCRIPT4CRASH_PAGE = DATA.url("script4crashpage.js");
const SCRIPT4BUG_PAGE = DATA.url("script4bugpage.js");
const CRASH_REGEX = /(\S+)\s(\S+)\s(\S+)\s(.+)$/;
const BUG_REGEX = /(\S+)\s(.+)/;
const { defer,all } = require('sdk/core/promise');

const crash_report_list = [];
let is_loading = false;

const loadBugzilla = function(relatedBug) {  
//  let bugzillaURL = "https://api-dev.bugzilla.mozilla.org/latest/bug/"+relatedBug.id;
  let bugzillaURL = "https://bugzilla.mozilla.org/show_bug.cgi?id="+relatedBug.id;
  PAGEWORKERS.Page({
    contentURL: bugzillaURL,
    contentScriptFile: [SCRIPT4BUG_PAGE],
    contentScriptWhen: "end",
    onMessage :function(message) {
      let lines = message.split("\n");
      let lastUpdated = lines[0];
      relatedBug.lastUpdated = lastUpdated;
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
    }
  });
}

const loadCrashReport = function(id, created) {  
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
  }
  crashReport.created = created;

  PAGEWORKERS.Page({
    contentURL: crashReportURL,
    contentScriptFile: [SCRIPT4CRASH_PAGE],
    contentScriptWhen: "end",
    onMessage :function(message) {
      let lines = message.split("\n");
      crashReport.title = lines[0];
      crashReport.total = lines.length-1;
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
        }
        relatedBug.status = status;
        relatedBug.resolution = resolution;
        relatedBug.summary = summary;
        relatedBug.isResolved = isResolved;
        relatedBug.users = [];
        crashReport.relatedBugs.push(relatedBug);
        loadBugzilla(relatedBug);
      }
      deferred.resolve();
    }
  });

  return deferred.promise;
}

const loadCrashReports = function() {
  is_loading = true;
  let transactions = [];
  //@see http://mxr.mozilla.org/mozilla-central/source/toolkit/crashreporter/CrashSubmit.jsm
  let path = FILE.join(SYSTEM.pathFor('UAppData'), "Crash Reports", "submitted");
  if(FILE.exists(path)) {
    let list = FILE.list(path);
    for (let i = list.length - 1; i >= 0; i--) {
      let logPath = FILE.join(path, list[i]);
      if(FILE.exists(logPath)) {

        let stats = new FS.Stats(logPath);
        let created = new Date(stats.mtime);

        let crashID = FILE.read(logPath);
        let indexOfColon = crashID.indexOf(":");
        crashID = crashID.substring(indexOfColon+2);
        let promise = loadCrashReport(crashID, created);
        transactions.push(promise);
      } else {
        console.log("Failed:: Find Log File");
      }
    }
  } else {
    console.log("Failed:: Find Crash Reports Directory");
  }
  all(transactions).then(function (result) {
    is_loading = false;
    return result;
  }, function (reason) {
    is_loading = false;
    console.log(reason)
    return reason;
  });
}

exports.getCrashReports = function() {
  return crash_report_list;
}

exports.isLoading = function() {
  return is_loading;
};

loadCrashReports();