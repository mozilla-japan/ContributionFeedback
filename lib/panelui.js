/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


const { Class } = require('sdk/core/heritage');
const XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
const UTILS = require("sdk/window/utils");

const getDocument = function() {
  let domWindow = UTILS.getMostRecentBrowserWindow();
  return domWindow.document;
}

const PanelUI = Class({
  initialize: function initialize(options) {
    let document = getDocument();
    let panelview = document.createElementNS(XUL_NS, "panelview");
    panelview.setAttribute("id", options.id);
    panelview.setAttribute("flex", "1");
    panelview.className = "PanelUI-subView";
    let vbox = document.createElementNS(XUL_NS, "vbox");
    vbox.className = "panel-subview-body";
    panelview.appendChild(vbox);
    this.view = panelview;
  },

  append: function(ui) {
    let current = this.findToolbarButton(ui.getAttribute("id"));
    if (current) {
      current.parentNode.removeChild(current);
    }
    let container = this.view.firstChild;
    container.appendChild(ui);
  },

  appendToolbarButton: function(id, label, image, className) {
    let document = getDocument();
    let toolbarbutton = document.createElementNS(XUL_NS, "toolbarbutton");
    toolbarbutton.setAttribute("id", id);
    toolbarbutton.className = className;
    toolbarbutton.setAttribute("label", label);
    toolbarbutton.setAttribute("image", image);
    toolbarbutton.setAttribute("crop", "none");
    this.append(toolbarbutton);
  },

  updateToolbarButton: function(id, label, image, className) {
    let target = this.findToolbarButton(id);
    if (!target) {
      return;
    }
    let container = this.view.firstChild;
    let document = getDocument();
    target.className = className;
    target.setAttribute("label", label);
    target.setAttribute("image", image);
  },

  hasToolbarButton: function(id) {
    let targets = this.view.getElementsByAttribute("id", id);
    return targets.length != 0;
  },

  findToolbarButton: function(id) {
    let targets = this.view.getElementsByAttribute("id", id);
    if (targets.length == 0) {
      console.log("id["+id+"] is not found in PanelUI")
      return;
    }
    return targets[0];
  },

  addEventListener: function(id, type, listener) {
    let target = this.findToolbarButton(id);
    if (!target) {
      return;
    }
    target.addEventListener(type, listener, false);
  },

  getView: function() {
    return this.view;
  }
});
exports.PanelUI = PanelUI;