/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Currently for MacOSX Only

var DATA = require("sdk/self").data;
var FILE = require("sdk/io/file");
var SYSTEM = require("sdk/system");
var PAGEWORKERS = require("sdk/page-worker");
var TABS = require("tabs");
var REGEX = /(\S+)\s(\S+)\s(\S+)\s(.+)$/;
var scriptURL = DATA.url("getStatus.js");
var MENU_ID = "menu_ContributionFeedback";
var MENU_POPUP_ID = "menu_ContributionFeedback_POPUP";
var MENU_LABEL = "Contribution Feedback";

var windowList = [];
var crashReportList = [];

function loadCrashReport(id) {
  var crashReportURL = "https://crash-stats.mozilla.com/report/index/" + id;
  PAGEWORKERS.Page({
    contentURL: crashReportURL,
    contentScriptFile: [scriptURL],
    contentScriptWhen: "end",
    onMessage :function(message) {
      var lines = message.split("\n");
      var crashReport = {};
      crashReport.id = id;
      crashReport.url = crashReportURL;
      crashReport.total = 0;
      crashReport.resoleved = 0;
      crashReport.title = lines[0];
      crashReport.total = lines.length-1;
      for (var i = 1, n = lines.length; i < n; i++) {
        var line = lines[i];
        var result = REGEX.exec(line);
        var bugid = result[1];
        var status = result[2];
        var resolution = result[3];
        var summary = result[4];
//        console.log("crashID:"+ id);
//        console.log("bugId:"+bugid);
//        console.log("bugStatus:" + status);
//        console.log("bugResolution:" + resolution);
//        console.log("bugSummary:" + summary);
        if (status == "RESOLVED" || status == "VERIFIED") {
          crashReport.resoleved += 1;
        }
      }
      crashReportList.push(crashReport);
      updateWindow(crashReport);
    }
  });
}

function loadCrashReportList() {
  crashReportList = [];
  //@see http://mxr.mozilla.org/mozilla-central/source/toolkit/crashreporter/CrashSubmit.jsm
  var path = FILE.join(SYSTEM.pathFor('UAppData'), "Crash Reports", "submitted");
  if(FILE.exists(path)) {
    var list = FILE.list(path);
    for (var i = list.length - 1; i >= 0; i--) {
      var logPath = FILE.join(path, list[i]);
      if(FILE.exists(logPath)) {
        var crashID = FILE.read(logPath);
        var indexOfColon = crashID.indexOf(":");
        crashID = crashID.substring(indexOfColon+2);
        loadCrashReport(crashID);
      } else {
        console.log("Failed:: Find Log File");
      }
    }
  } else {
    console.log("Failed:: Find Crash Reports Directory");
  }
}

function updateWindow(crashReport) {
  for (var i = 0, n = windowList.length; i < n; i++) {
    var win = windowList[i];
    updateMenuitem(win, crashReport);
  }
}

function updateMenuitems() {
  for (var i = 0, n = crashReportList.length, m = windowList.length; i < n; i++) {
    var crashReport = crashReportList[i];
    updateWindow(crashReport);
  }
}

function updateMenuitem(win, crashReport) {
  var crashMenuItem = win.document.getElementById(crashReport.id);
  if (crashMenuItem == null) {
    crashMenuItem = win.document.createElement("menuitem");
    crashMenuItem.setAttribute("id", crashReport.id);
    var menu = win.document.getElementById(MENU_POPUP_ID);
    menu.appendChild(crashMenuItem);
  }
  var label = crashReport.title ? crashReport.title.substring(0, crashReport.id.length) : crashReport.id;
  if (crashReport.total != 0) {
    if (crashReport.total == crashReport.resoleved) {
      label += " : RESOLVED!";
    } else {
      label += " : " + crashReport.resoleved +" / "+crashReport.total;
    }
  }
  crashMenuItem.setAttribute("label", label);
//  crashMenuItem.setAttribute("image", "");
  crashMenuItem.addEventListener("command", function() {
    TABS.open(crashReport.url);
  }, false);
}

var delegate = {
  onTrack: function (win) {
//    var parentpopup = win.document.getElementById("main-menubar");
    var parentpopup = win.document.getElementById("menu_ToolsPopup");
    var menu = win.document.createElement("menu");
    menu.setAttribute("id", MENU_ID);
    menu.setAttribute("label", MENU_LABEL);
    parentpopup.appendChild(menu);
    var menupopup = win.document.createElement("menupopup");
    menupopup.setAttribute("id", MENU_POPUP_ID);
    menu.appendChild(menupopup);

    windowList.push(win);
    updateMenuitems();

  },
  onUntrack: function (win) {
//    console.log("Untracking a window: " + win.location);
    for (var i = 0, n = windowList.length; i < n; i++) {
      if (windowList[i] == win) {
        windowList.splice(i, 1);
        break;
      }
    }
  }
};
var winUtils = require("window-utils");
new winUtils.WindowTracker(delegate);

loadCrashReportList();