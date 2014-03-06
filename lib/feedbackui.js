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
    let crashReport = options.crashReport;
    let document = getDocument();

    let container = document.createElementNS(XUL_NS, "vbox");
    container.className = "FeedbackUI";
    container.setAttribute("id", crashReport.id);

    let labelBox = document.createElementNS(XUL_NS, "hbox");
    labelBox.className = "labelBox";

    let created = crashReport.created;
    let month = getNumberLabel(created.getMonth()+1);
    let date = getNumberLabel(created.getDate());
    let hours = getNumberLabel(created.getHours());
    let minutes = getNumberLabel(created.getMinutes());
    let seconds = getNumberLabel(created.getSeconds());
    let createdDateText = created.getFullYear() +"-"+ month +"-"+ date;
    let createdLabelText = "crash id:"+crashReport.id + "\n" +crashReport.title ? crashReport.title : "LOADING...";

    let updatedLabel = document.createElementNS(XUL_NS, "label");
    updatedLabel.className = "updatedLabel";
    labelBox.appendChild(updatedLabel);

    let createdLabel = document.createElementNS(XUL_NS, "label");
    createdLabel.className = "createdLabel";
    createdLabel.setAttribute("value", "("+createdDateText+" reported)");
    labelBox.appendChild(createdLabel);

    let resolvedLabelContainer = document.createElementNS(XUL_NS, "hbox");
    resolvedLabelContainer.className = "resolvedLabelContainer";
    let resolvedLabel = document.createElementNS(XUL_NS, "label");    
    resolvedLabel.setAttribute("crop", "end");
    resolvedLabel.className = "resolvedLabel";
    resolvedLabelContainer.appendChild(resolvedLabel);
    labelBox.appendChild(resolvedLabelContainer);

    container.appendChild(labelBox);

    let imageBoxContainer = document.createElementNS(XUL_NS, "vbox");
    let relatedBugs = crashReport.relatedBugs;
    if (relatedBugs.length == 0) {
      container.className += " noupdate";
      container.setAttribute("tooltiptext", createdLabelText);
      resolvedLabelContainer.setAttribute("crop", "end");
      resolvedLabel.setAttribute("value", crashReport.title ? crashReport.title : crashReport.id);
    } else {
      lastUpdated = crashReport.lastUpdated;
      let imageBox = null;
      let userMap = {};
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
          if (userMap[userName]) {
            continue;
          }
          let icon = document.createElementNS(XUL_NS, "image");
          icon.className = "userImage";
          icon.setAttribute("src", imageURL);
          icon.setAttribute("tooltiptext", userName);
          imageBox.appendChild(icon);
          count += 1;
          if (count == 15) {
            count = 0;
          }
          userMap[userName] = imageURL;
        }
      }
      container.appendChild(imageBoxContainer);

      let percent = parseInt((crashReport.totalBugResolved / relatedBugs.length) * 100);
      if (percent == 100) {
        container.className += " complete";
        updatedLabel.className += " complete";
      } else {
        container.className += " progress";
        updatedLabel.className += " progress";
      }
      container.style.backgroundSize = percent+"%";
      if (lastUpdated) {
        container.setAttribute("tooltiptext", "LAST UPDATED:"+lastUpdated+"\n"+createdLabelText);
        updatedLabel.setAttribute("value", lastUpdated);
      } else {
        container.setAttribute("tooltiptext", createdLabelText);
        updatedLabel.setAttribute("value", "LOADING");
      }
      resolvedLabel.setAttribute("value", percent+"%");
      resolvedLabelContainer.setAttribute("pack", "end");
    }


    container.addEventListener("click", function() {
      TABS.open(crashReport.url);
    });

    this.view = container;
  },

  getView: function() {
    return this.view;
  }
});
exports.FeedbackUI = FeedbackUI;