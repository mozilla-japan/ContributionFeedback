/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var relatedBugs = document.querySelectorAll(".bug-link-with-data");
var message = document.title;
for (var i = 0; i < relatedBugs.length; i++) {
  var bug = relatedBugs[i]
  var id = bug.getAttribute("data-id");
  var status = bug.getAttribute("data-status");
  var resolution = bug.getAttribute("data-resolution");
  resolution = resolution == null || resolution.length == 0 ? "---" : resolution;
  var summary = bug.getAttribute("data-summary");
  message += "\n";
  message += id+" "+status+" "+resolution+" "+summary;
}
self.postMessage(message);