/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var users = document.querySelectorAll(".bz_comment_user");
var message = "";
if (users.length > 0) {
  var user = users[users.length-1];
  var icon = user.querySelector("img");
  var vcard = user.querySelector(".vcard");
  message = icon.getAttribute("src")+" "+vcard.textContent;
}
self.postMessage(message);