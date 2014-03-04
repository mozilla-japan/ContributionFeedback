/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


const { Class } = require('sdk/core/heritage');
const UTILS = require("sdk/window/utils");
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const TABS = require("sdk/tabs");
const SELF = require("sdk/self");

const getDocument = function() {
  let domWindow = UTILS.getMostRecentBrowserWindow();
  return domWindow.document;
}

const getNumberLabel = function(num) {
  return num < 10 ? "0"+num : num;
}

const FeedbackUI = Class({
  initialize: function initialize(options) {
    let crashreport = options.crashreport;
    let document = getDocument();

    let container = document.createElementNS(XUL_NS, "hbox");
    container.className = "FeedbackUI";
    container.setAttribute("id", crashreport.id);

    let created = crashreport.created;
    let month = getNumberLabel(created.getMonth()+1);
    let date = getNumberLabel(created.getDate());
    let hours = getNumberLabel(created.getHours());
    let minutes = getNumberLabel(created.getMinutes());
    let seconds = getNumberLabel(created.getSeconds());
    let createdLabelText = created.getFullYear() +"."+ month +"."+ date +" "+ hours +":"+ minutes +":"+ seconds;
    createdLabelText += " crashed\n" +(crashreport.title ? crashreport.title : "LOADING...");

    let updatedLabel = document.createElementNS(XUL_NS, "label");
    updatedLabel.className = "updatedLabel";
    updatedLabel.setAttribute("tooltiptext", createdLabelText);
    updatedLabel.setAttribute("flex", "1");
    container.appendChild(updatedLabel);

    let resolvedLabelContainer = document.createElementNS(XUL_NS, "hbox");
    resolvedLabelContainer.className = "resolvedLabelContainer";
    resolvedLabelContainer.setAttribute("flex", "1");
    resolvedLabelContainer.setAttribute("pack", "end");
    let resolvedLabel = document.createElementNS(XUL_NS, "label");    
    resolvedLabel.className = "resolvedLabel";
    resolvedLabel.setAttribute("tooltiptext", createdLabelText);
    resolvedLabel.setAttribute("pack", "end");
    resolvedLabelContainer.appendChild(resolvedLabel);
    container.appendChild(resolvedLabelContainer);

    let imageBoxContainer = document.createElementNS(XUL_NS, "vbox");
//    imageBoxContainer.setAttribute("flex", "1000");

    let relatedBugs = crashreport.relatedBugs;
    let lastUpdated = "";
    let totalResolved = 0;
    let imageBox = null;
    for (let i = 0, n = relatedBugs.length, count = 0; i < n; i++) {
      let relatedBug = relatedBugs[i];
      for (let j = 0, m = relatedBug.users.length; j < m; j++) {
        let user = relatedBug.users[j];
        let userName = user.userName;
        let imageURL = user.imageURL;
        if (count == 0) {
          imageBox = document.createElementNS(XUL_NS, "hbox");
          imageBox.className = "imageBox";
          imageBoxContainer.appendChild(imageBox);
        }
        if (imageBox.getElementsByAttribute("tooltiptext", userName).length != 0) {
          continue;
        }
        let icon = document.createElementNS(XUL_NS, "image");
        icon.className = "userImage";
        icon.setAttribute("src", imageURL);
        icon.setAttribute("tooltiptext", userName);
        imageBox.appendChild(icon);
        count += 1;
        if (count == 10) {
          count = 0;
        }
      }
      if (lastUpdated.length == 0 || lastUpdated < relatedBug.lastUpdated) {
        lastUpdated = relatedBug.lastUpdated;
      }
      totalResolved += relatedBug.isResolved == true ? 1 : 0;
    }
    container.appendChild(imageBoxContainer);

    let percent = parseInt((totalResolved / relatedBugs.length) * 100);
    let backgroundImage = percent == 100 ? "complete.png" : "progress.png"
    let backgroundImageURL = SELF.data.url(backgroundImage);
    container.style.backgroundImage = "url("+backgroundImageURL+")";
    container.style.backgroundSize = percent+"%";

    lastUpdated = lastUpdated ? lastUpdated +" updated" : "LOADING...";
    updatedLabel.setAttribute("value", lastUpdated+" :");
    resolvedLabel.setAttribute("value", percent+"% RESOLVED");

    container.addEventListener("click", function() {
      TABS.open(crashreport.url);
    });

    this.view = container;
  },

  getView: function() {
    return this.view;
  }
});
exports.FeedbackUI = FeedbackUI;