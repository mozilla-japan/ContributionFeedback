/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var statuses = document.querySelectorAll('.full_bug_ids li');
for (var i = 0; i < statuses.length; i++) {
  self.postMessage(statuses[i].textContent+':'+self.options.errorId);
}