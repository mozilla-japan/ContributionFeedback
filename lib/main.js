/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Currently for MacOSX Only

var DATA = require("sdk/self").data;
var FILE = require("sdk/io/file");
var SYSTEM = require("sdk/system");
var PAGEWORKERS = require("sdk/page-worker");
var scriptURL = DATA.url("getStatus.js");

//@see http://mxr.mozilla.org/mozilla-central/source/toolkit/crashreporter/CrashSubmit.jsm
var path = FILE.join(SYSTEM.pathFor('UAppData'), "Crash Reports", "submitted");
console.log("Crash Reports Directory Path is " + path);

if(FILE.exists(path)) {
  console.log("Success:: Find Crash Reports Directory");
  var list = FILE.list(path);

  for (var i = list.length - 1; i >= 0; i--) {
    var logPath = FILE.join(path, list[i]);
    console.log(logPath);
    if(FILE.exists(logPath)) {
      console.log("Success:: Find Log File");
      var errorId = FILE.read(logPath);

      var pos = errorId.indexOf(":");
      errorId = errorId.substring(pos+2, errorId.length);
      console.log("errorId: "+errorId);

      var contentUrl = "https://crash-stats.mozilla.com/report/index/" + errorId;
      console.log("contentUrl: " + contentUrl);

      PAGEWORKERS.Page({
        contentURL: contentUrl,
        contentScript: scriptURL,
        contentScriptWhen: "end",
        contentScriptOptions: {errorId: errorId},
        onMessage :function(message){
          var parentErrorId = message.substring(message.lastIndexOf(":")+1, message.length);
          var bugId = message.substring(0,message.indexOf(" "));
          var messageWithoutId = message.substring(message.indexOf(" ")+1, message.length);
          var bugStatus = messageWithoutId.substring(0, messageWithoutId.indexOf(" "));

          console.log("errorId:"+ parentErrorId + " bugId:"+bugId + " bugStatus:" + bugStatus);
        }
      });

    } else {
      console.log("Failed:: Find Log File");
    }
  }
} else {
  console.log("Failed:: Find Crash Reports Directory");
}
// console.log(fileIo.exists(path));
