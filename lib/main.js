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

const updateUI = function(panelui) {
  let crashReports = CRASH_REPORTS.getCrashReports();
  for (let i = 0, n = crashReports.length; i < n; i++) {
    let crashReport = crashReports[i];
    let feedbackui = new FEEDBACKUI.FeedbackUI({crashReport:crashReport});
    let feedbackview = feedbackui.getView();
    panelui.append(feedbackview);
  }
};

const button = ActionButton({
  id: ID,
  label: "Your Contribution",
  icon: {
    "16": SELF.data.url("icon16.png"),
    "32": SELF.data.url("icon32.png"),
    "64": SELF.data.url("icon64.png")
  },
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
let domWindow = UTILS.getMostRecentBrowserWindow();
let document = domWindow.document;
css_element = document.createElementNS("http://www.w3.org/1999/xhtml", "link");
css_element.setAttribute("rel", "stylesheet");
css_element.setAttribute("media", "all");
css_element.setAttribute("href", SELF.data.url("contributionfeedback.css"));
