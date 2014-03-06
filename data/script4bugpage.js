/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var message = "";

var ths = document.querySelectorAll("#bz_show_bug_column_2 .field_label");
var indexOfLastModified = -1;
for (var i = 0, n = ths.length; i < n; i++) {
  var th = ths[i];
  if (th.textContent.toLowerCase().indexOf("modified:") > -1) {
  	indexOfLastModified = i;
	break;
  }
}
var tds = document.querySelectorAll("#bz_show_bug_column_2 td");
var targetLastModified = tds[indexOfLastModified].textContent;
var regexLastModified = /^\s*(\S+)/;
var resultLastModified = regexLastModified.exec(targetLastModified);
var lastModified = resultLastModified[1];
message += lastModified;

var users = document.querySelectorAll(".bz_comment_user");
for (var i = 0, n = users.length; i < n; i++) {
  var user = users[i];
  var icon = user.querySelector("img");
  var vcard = user.querySelector(".vcard");
  message += "\n";
  message += icon.getAttribute("src")+" "+vcard.textContent;
}
self.postMessage(message);