/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Currently for MacOSX Only

var { Ci } = require("chrome");
var DATA = require("sdk/self").data;
var FILE = require("sdk/io/file");
var SYSTEM = require("sdk/system");
var PAGEWORKERS = require("sdk/page-worker");
var TABS = require("tabs");

var SCRIPT4CRASH_PAGE = DATA.url("script4crashpage.js");
var SCRIPT4BUG_PAGE = DATA.url("script4bugpage.js");
var CRASH_REGEX = /(\S+)\s(\S+)\s(\S+)\s(.+)$/;
var BUG_REGEX = /(\S+)\s(.+)/;

var MENU_ID = "menu_ContributionFeedback";
var MENU_POPUP_ID = "menu_ContributionFeedback_POPUP";
var MENU_LABEL = "Your Contribution";

var windowList = [];
var crashReportList = [];

function loadCrashReport(id) {
  var crashReportURL = "https://crash-stats.mozilla.com/report/index/" + id;
  var crashReport = {};
  crashReport.id = id;
  crashReport.url = crashReportURL;
  crashReport.relatedBugs = [];

  crashReportList.push(crashReport);
  updateWindow(crashReport);

  PAGEWORKERS.Page({
    contentURL: crashReportURL,
    contentScriptFile: [SCRIPT4CRASH_PAGE],
    contentScriptWhen: "end",
    onMessage :function(message) {
      var lines = message.split("\n");
      crashReport.title = lines[0];
      crashReport.total = lines.length-1;
      for (var i = 1, n = lines.length; i < n; i++) {
        var line = lines[i];
        var result = CRASH_REGEX.exec(line);
        var bugid = result[1];
        var status = result[2];
        var resolution = result[3];
        var summary = result[4];
        var isResolved = status == "RESOLVED" || status == "VERIFIED";
        var relatedBug = {id:bugid, status:status, resolution:resolution, summary:summary, isResolved:isResolved};
        crashReport.relatedBugs.push(relatedBug);
      }
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
    var window = windowList[i];
    updateCrashReoprtUI(window, crashReport);
  }
}

function updateAll() {
  for (var i = 0, n = crashReportList.length, m = windowList.length; i < n; i++) {
    var crashReport = crashReportList[i];
    updateWindow(crashReport);
  }
}

function updateCrashReoprtUI(window, crashReport) {
  var crashMenuPopupID = crashReport.id+"P";
  var crashMenu = null;
  var crashMenuPopup = window.document.getElementById(crashMenuPopupID);
  if (crashMenuPopup == null) {
    crashMenu = window.document.createElement("menu");
    crashMenu.setAttribute("id", crashReport.id);

    crashMenuPopup = window.document.createElement("menupopup");
    crashMenuPopup.setAttribute("id", crashMenuPopupID);
    crashMenu.appendChild(crashMenuPopup);

    var crashReportMenu = window.document.createElement("menuitem");
    crashReportMenu.setAttribute("id", crashReport.id+"R");
    crashReportMenu.setAttribute("label", "show crash report["+crashReport.id+"]");
    crashReportMenu.addEventListener("command", function() {
      TABS.open(crashReport.url);
    }, false);
    crashMenuPopup.appendChild(crashReportMenu);
    crashMenuPopup.appendChild(window.document.createElement("menuseparator"));
    var relatedBugsMenu = window.document.createElement("menuitem");
    relatedBugsMenu.setAttribute("label", "-- related bugs --");
    crashMenuPopup.appendChild(relatedBugsMenu);


    var menu = window.document.getElementById(MENU_POPUP_ID);
    menu.appendChild(crashMenu);
  } else {
    crashMenu = crashMenuPopup.parentNode;
  }

  var label = crashReport.title ? crashReport.title.substring(0, crashReport.id.length) : crashReport.id;
  crashMenu.setAttribute("label", label);

  for (var i = 0, n = crashReport.relatedBugs.length; i < n; i++) {
    var relatedBug = crashReport.relatedBugs[i];
    var uiid = crashReport.id + "-" + relatedBug.id;
    var bugMenuItem = window.document.getElementById(uiid);
    var bugURL = "https://bugzilla.mozilla.org/show_bug.cgi?id="+relatedBug.id;
    if (bugMenuItem == null) {
      bugMenuItem = window.document.createElement("menuitem");
      bugMenuItem.setAttribute("id", uiid);
      bugMenuItem.addEventListener("command", function() {
        TABS.open(bugURL);
      }, false);
      crashMenuPopup.appendChild(bugMenuItem);
    }
    bugMenuItem.setAttribute("label", "["+relatedBug.status+" "+relatedBug.resolution+"]"+relatedBug.summary.substring(0, 30));
    //load icon
    updateBugIcon(bugMenuItem, relatedBug, bugURL);
  }
}

function updateBugIcon(bugMenuItem, relatedBug, bugURL) {
  PAGEWORKERS.Page({
    contentURL: bugURL,
    contentScriptFile: [SCRIPT4BUG_PAGE],
    contentScriptWhen: "end",
    onMessage :function(message) {
      if (message.length == 0) {
        return;
      }
      var result = BUG_REGEX.exec(message);
      var commentatorImage = result[1];
      var commentator = result[2];
      bugMenuItem.setAttribute("image", commentatorImage);
      var newLabel = commentator+" "+bugMenuItem.getAttribute("label");
      bugMenuItem.setAttribute("label", newLabel);
    }
  });
}

var delegate = {
  onTrack: function (window) {
    var parentpopup = window.document.getElementById("main-menubar");
    var menu = window.document.createElement("menu");
    menu.setAttribute("id", MENU_ID);
    menu.setAttribute("label", MENU_LABEL);
    parentpopup.appendChild(menu);
    var menupopup = window.document.createElement("menupopup");
    menupopup.setAttribute("id", MENU_POPUP_ID);
    menu.appendChild(menupopup);
    windowList.push(window);
    updateAll();

    var utils = window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
    try {
      utils.forceUpdateNativeMenuAt(null);
    } catch (e) {
      console.log(e);
    }
  },
  onUntrack: function (window) {
//    console.log("Untracking a window: " + window.location);
    for (var i = 0, n = windowList.length; i < n; i++) {
      if (windowList[i] == window) {
        windowList.splice(i, 1);
        break;
      }
    }
  }
};
var winUtils = require("window-utils");
new winUtils.WindowTracker(delegate);
loadCrashReportList();