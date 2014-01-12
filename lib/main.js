// Currently for MacOSX Only

var data = require("sdk/self").data;
var file = require("sdk/io/file");
var system = require("sdk/system");
var pageMod = require("sdk/page-mod");
var pageWorkers = require("sdk/page-worker");


var content_script = "var statuses = document.querySelectorAll('.full_bug_ids li');" +
                     "for (var i = 0; i<statuses.length; i++) {" +
                     "	self.postMessage(statuses[i].textContent+':'+self.options.error_id);" +
                     "}";



// console.log("profile directory = " + system.pathFor("ProfD"));

// path should "~/Library/Application Support/Firefox/"
var profile_path = system.pathFor('ProfD');
var path = file.dirname(profile_path);
// console.log("backslash is in " + path.indexOf("\\"));


path = path.replace("\\",'');
path += "/Crash Reports/submitted/";
console.log("Crash Reports Directory Path is " + path);

if(file.exists(path))
{
	console.log("Success:: Find Crash Reports Directory");
	var list = file.list(path);

	for (var i = list.length - 1; i >= 0; i--) {
		var log_path = path+list[i];
		console.log(log_path);

		if(file.exists(log_path)){
			console.log("Success:: Find Log File");
			error_id = file.read(log_path);
			// console.log(error_id);

			var pos = error_id.indexOf(":");
			error_id = error_id.substring(pos+2,error_id.length);
			console.log("error_id: "+error_id);


			var content_url = "https://crash-stats.mozilla.com/report/index/" + error_id;
			console.log("content_url: " + content_url);

			pageWorkers.Page({
				contentURL: content_url,
				contentScript: content_script,
				contentScriptWhen: "end",
				contentScriptOptions: {error_id: error_id},
				onMessage :function(message){
					var parent_error_id = message.substring(message.lastIndexOf(":")+1, message.length);
					var bug_id = message.substring(0,message.indexOf(" "));
					var message_without_id = message.substring(message.indexOf(" ")+1, message.length);
					var bug_status = message_without_id.substring(0, message_without_id.indexOf(" "));

					console.log("error_id:"+ parent_error_id + " bug_id:"+bug_id + " bug_status:" + bug_status);
				}
			});



		}
		else{
			console.log("Failed:: Find Log File");
		}
	}

}
else{
	console.log("Failed:: Find Crash Reports Directory");
}
// console.log(fileIo.exists(path));
