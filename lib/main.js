/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const { ActionButton } = require("sdk/ui/button/action");
const { Ci } = require("chrome");
const PANELUI = require('./panelui');
const FEEDBACKUI = require('./feedbackui');
const SELF = require("sdk/self");
const UTILS = require("sdk/window/utils");
const CRASH_REPORTS = require("./crashreports");
const ID = "contribution-feedback";
const PANELID = "PanelUI-"+ID;
const XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
const BUTTON_PREFIX = ID+"-";

let current_popup = null;
let css_element = null;

const findMyself = function(element) {
  if (element.id && element.id.indexOf(ID) >= 0) {
    return element;
  }
  let nodelist = element.children;
  if (nodelist) {
    for (let i = 0, n = nodelist.length; i < n; i++) {
      let childElement = nodelist[i];
      let result = findMyself(childElement);
      if (result) {
        return result;
      }
    }
  }
  return null;
};

const isSameBugs = function(crashReport1, crashReport2) {
  if (crashReport1.relatedBugs.length == 0 || crashReport2.relatedBugs.length == 0 || crashReport1.relatedBugs.length != crashReport2.relatedBugs.length) {
    return false;
  }
  let lengthOfBug1 = crashReport1.relatedBugs.length;
  let lengthOfBug2 = crashReport2.relatedBugs.length;
  for (let i = 0; i < lengthOfBug1; i++) {
    let bug1 = crashReport1.relatedBugs[i];
    let exists = false;
    for (let j = 0; j < lengthOfBug2; j++) {
      let bug2 = crashReport2.relatedBugs[j];
      if (bug1.id == bug2.id) {
        exists = true;
        break;
      }
    }
    if (exists == false) {
      return false;
    }
  }
  for (let i = 0; i < lengthOfBug2; i++) {
    let bug2 = crashReport2.relatedBugs[i];
    let exists = false;
    for (let j = 0; j < lengthOfBug1; j++) {
      let bug1 = crashReport1.relatedBugs[j];
      if (bug1.id == bug2.id) {
        exists = true;
        break;
      }
    }
    if (exists == false) {
      return false;
    }
  }
  return true;
}

const shouldShow = function(crashReports, currentIndex, threshholdDateTime) {
  let crashReport = crashReports[currentIndex];
  let couldLoad = crashReport.title;
  if (!couldLoad) {
    return false;
  }
  if (crashReport.isNotFound == true) {
    return false;
  }

  let existsSameBugsCrash = false;
  for (let i = 0; i < currentIndex; i++) {
    if (isSameBugs(crashReport, crashReports[i]) == true) {
      existsSameBugsCrash = true;
      break;
    }
  }
  if (existsSameBugsCrash == true) {
    return false;
  }

  if (crashReport.totalBugResolved == crashReport.relatedBugs.length) {
    return true;
  }
  
  let comparableDate = crashReport.lastUpdatedDate ? crashReport.lastUpdatedDate : crashReport.createdDate;
  let isTooOld = comparableDate.getTime() < threshholdDateTime;
  if (isTooOld) {
    return false;
  }
  return true;
}

const updateUI = function(panelui) {
  let crashReports = CRASH_REPORTS.getCrashReports();
  let thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate()-(7*6*4));
  let thresholdDateTiem = thresholdDate.getTime();

  for (let i = 0, n = crashReports.length; i < n; i++) {
    if (shouldShow(crashReports, i, thresholdDateTiem) == false) {
      continue;
    }
    let feedbackui = new FEEDBACKUI.FeedbackUI({crashReport:crashReports[i]});
    let feedbackview = feedbackui.getView();
    panelui.append(feedbackview);
  }
};

const button = ActionButton({
  id: ID,
  label: "Your Contribution",
  icon: SELF.data.url("icon64.png"),
  onClick: function(state) {
    if (!this.panelui) {
      this.panelui = new PANELUI.PanelUI({id:PANELID});
    }
    updateUI(this.panelui);

    let panelview = this.panelui.getView();
    let domWindow = UTILS.getMostRecentBrowserWindow();
    let container = domWindow.document.getElementById("PanelUI-multiView");
    container.appendChild(panelview);

    let navbar = domWindow.document.getElementById("nav-bar");
    let aAnchor = findMyself(navbar);
    if (aAnchor) {
      domWindow.document.documentElement.appendChild(css_element);
      domWindow.PanelUI.showSubView(PANELID, aAnchor);
      let popup = domWindow.document.getElementById("customizationui-widget-panel");
      popup.addEventListener("popuphidden", function() {
        css_element.parentNode.removeChild(css_element);
      });
    }
  }
});

CRASH_REPORTS.setUpdateListener({
  start: function() {
    let domWindow = UTILS.getMostRecentBrowserWindow();
    let navbar = domWindow.document.getElementById("nav-bar");
    let aAnchor = findMyself(navbar);
    let image = domWindow.document.getAnonymousNodes(aAnchor)[0];
    image.setAttribute("src", SELF.data.url("loading64.gif"));
  },
  end: function() {
    let domWindow = UTILS.getMostRecentBrowserWindow();
    let navbar = domWindow.document.getElementById("nav-bar");
    let aAnchor = findMyself(navbar);
    let image = domWindow.document.getAnonymousNodes(aAnchor)[0];
    image.setAttribute("src", SELF.data.url("icon64.png"));
  }
});
CRASH_REPORTS.load();

let domWindow = UTILS.getMostRecentBrowserWindow();
let document = domWindow.document;
css_element = document.createElementNS("http://www.w3.org/1999/xhtml", "link");
css_element.setAttribute("rel", "stylesheet");
css_element.setAttribute("media", "all");
css_element.setAttribute("href", SELF.data.url("contributionfeedback.css"));
