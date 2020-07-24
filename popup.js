"use strict";

const HIDE_USER_CSS = 'hide-user';
const HIDE_RESOLVED_CSS = 'hide-resolved';
const HIDE_RESOLVED_DISCUSSIONS_ELEMENT = 'hideResolvedDiscussions';
const HIDE_OLD_JENKINS_CSS = 'hide-old-jenkins';
const HIDE_OLD_JENKINS_ELEMENT = 'hideOldJenkins';
const HIDE_OLD_COMMITS_CSS = 'hide-old-commits';
const HIDE_OLD_COMMITS_ELEMENT = 'hideOldCommits';
const HIDE_REBUILDS_ELEMENT = 'hideRebuilds';
const HIDE_REBUILDS_CSS = 'hide-rebuilds';
const HIDE_OLD_EVERYTHING_ELEMENT = 'hideOldEverything';
const HIDE_OLD_EVERYTHING_CSS = 'hide-old-everything';
var discussingUsers = {};
let currentTabId;

const hasSomeParentTheClassString = `
	function hasSomeParentTheClass(element, classname) {
		if(!element.className)
			return false;
		if (element.className.split(' ').indexOf(classname)>=0) return true;
		return element.parentNode && hasSomeParentTheClass(element.parentNode, classname);
	};
`
const checkboxInfos = {
	[HIDE_RESOLVED_DISCUSSIONS_ELEMENT]: {hideFunction: hideResolvedDiscussions, showFunction: showResolvedDiscussions, css: HIDE_RESOLVED_CSS},
	[HIDE_OLD_JENKINS_ELEMENT]: {hideFunction: hideOldJenkins, showFunction: showOldJenkins, css: HIDE_OLD_JENKINS_CSS},
	[HIDE_OLD_COMMITS_ELEMENT]: {hideFunction: hideOldCommits, showFunction: showOldCommits, css: HIDE_OLD_COMMITS_CSS},
	[HIDE_REBUILDS_ELEMENT]: {hideFunction: hideRebuilds, showFunction: showRebuilds, css: HIDE_REBUILDS_CSS},
	[HIDE_OLD_EVERYTHING_ELEMENT]: {hideFunction: hideOldEverything, showFunction: showOldEverything, css: HIDE_OLD_EVERYTHING_CSS}
}

document.addEventListener('DOMContentLoaded', initiate(), false);

function documentEvents() {
	Object.keys(checkboxInfos).forEach(elementName => 
		addEventListenersForCheckbox(elementName))
}

function addEventListenersForCheckbox(elementName) {
	var element = document.getElementById(elementName);
	element.addEventListener('change', onCheckboxChange(element, checkboxInfos[elementName].hideFunction, checkboxInfos[elementName].showFunction));
	element.parentElement.children[1].addEventListener('click', onLabelClick(element, checkboxInfos[elementName].hideFunction, checkboxInfos[elementName].showFunction));
}

function onLabelClick(element, hideFunction, showFunction) {
	return function () {
		if (element.checked) {
			showFunction();
			element.checked = false;
		}
		else {
			hideFunction();
			element.checked = true;
		}
	};
}

function onCheckboxChange(element, hideFunction, showFunction) {
	return function () {
		if (element.checked) {
			hideFunction();
		}
		else {
			showFunction();
		}
	};
}

function refreshList() {
	let filterUserList = document.getElementById("filterUserList");
	filterUserList.innerHTML = "";
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		Object.keys(discussingUsers).forEach(user => {
			const userRow = document.createElement("li");
			if(discussingUsers.hasOwnProperty(user))
				userRow.classList.add("discussingUser");
			if (discussingUsers[user])
				userRow.classList.add("selected");
			userRow.textContent = user;

			userRow.onmousedown = function() {
				if (!userRow.classList.contains("buttonMouseDown")) {
					userRow.classList.add("buttonMouseDown");
				}
			};

			userRow.onmouseup = function() {
				if (userRow.classList.contains("buttonMouseDown")) {
					userRow.classList.remove("buttonMouseDown");
				}
			};

			userRow.onmouseleave = userRow.onmouseup;

			userRow.onclick = function() {
				if (userRow.classList.contains("selected")) {
					userRow.classList.remove("selected");
					removeFilteredUser(user);
				} else {
					userRow.classList.add("selected");
					addFilteredUser(user);
				}
			};

			filterUserList.appendChild(userRow);
		});
	});
}

function hasSomeParentTheClass(element, classname) {
    if (element.className.split(' ').indexOf(classname)>=0) return true;
    return element.parentNode && hasSomeParentTheClass(element.parentNode, classname);
}


function initiate(){
	chrome.tabs.insertCSS({file: "gitlab-filter.css"});
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		currentTabId = tabs[0].id;
		initiateCheckboxes();
	});
	initiateDiscussingUsers();
	documentEvents();
}

function initiateCheckboxes(){
	for(let el of Object.keys(checkboxInfos)){
		var script = `
		(
			function(){
				return document.getElementsByClassName("${checkboxInfos[el].css}").length > 0;
			}
		)()
		`;
		chrome.tabs.executeScript(
			{code: script},
			function (results) {
				document.getElementById(el).checked = results[0];
			}
		)
	}
}

function initiateDiscussingUsers(){
	var script = `
	${hasSomeParentTheClassString}
	(
		function(){
		var users = {};
		var timelineEntries = document.getElementsByClassName("timeline-entry");
		for (let timelineEntry of timelineEntries){
			if(timelineEntry.classList.contains("system-note"))
				continue;
			if(hasSomeParentTheClass(timelineEntry, "discussion-notes"))
				continue;
			var headerInfo = timelineEntry.getElementsByClassName("note-header-info")[0];
			if(!headerInfo)
				continue;
			var user = headerInfo.getElementsByClassName("note-header-author-name")[0].textContent;
			if(users.hasOwnProperty(user))
				continue;
			users[user] = timelineEntry.classList.contains("${HIDE_USER_CSS}");
		}
		return users;
	})()
	`;
	chrome.tabs.executeScript(
		{code: script}, 
		function (results) {
			discussingUsers = results[0];
			refreshList();
		});
}

function addFilteredUser(filterUser) {
	var script = `
	${hasSomeParentTheClassString}
	
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries){
		if(timelineEntry.classList.contains("system-note"))
			continue;
		if(hasSomeParentTheClass(timelineEntry, "discussion-notes"))
			continue;
		var headerInfo = timelineEntry.getElementsByClassName("note-header-info")[0];
		if(!headerInfo)
			continue;
		var user = headerInfo.getElementsByClassName("note-header-author-name")[0].textContent;
		if(user.toLowerCase() == "${filterUser.toLowerCase()}"){
			timelineEntry.classList.add("${HIDE_USER_CSS}");
		}
	}`
	chrome.tabs.executeScript({code: script});
}

function removeFilteredUser(filterUser) {
	var script = `
	${hasSomeParentTheClassString}
	
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries){
		if(!timelineEntry.classList.contains("${HIDE_USER_CSS}"))
			continue;
		var headerInfo = timelineEntry.getElementsByClassName("note-header-info")[0];
		var user = headerInfo.getElementsByClassName("note-header-author-name")[0].textContent;
		if(user.toLowerCase() == "${filterUser.toLowerCase()}"){
			timelineEntry.classList.remove("${HIDE_USER_CSS}");
		}
	}`
	chrome.tabs.executeScript({code: script});
}

function hideResolvedDiscussions() {
	var script = `
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries){
		if(!timelineEntry.classList.contains("note-discussion"))
			continue;
		var headline = timelineEntry.getElementsByClassName("discussion-headline-light");
		if(headline.length > 0 && headline[0].textContent.includes("Resolved"))
			timelineEntry.classList.add("${HIDE_RESOLVED_CSS}");
	}
	`
	chrome.tabs.executeScript({code: script});
	saveSetCheckboxValue(HIDE_RESOLVED_DISCUSSIONS_ELEMENT);
}

function showResolvedDiscussions() {
	var script = `
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries){
		if(timelineEntry.classList.contains("${HIDE_RESOLVED_CSS}"))
			timelineEntry.classList.remove("${HIDE_RESOLVED_CSS}");
	}
	`
	chrome.tabs.executeScript({code: script});
	saveClearCheckboxValue(HIDE_RESOLVED_DISCUSSIONS_ELEMENT);
}

function hideOldJenkins() {
	var script = `
	var jenkinsEntries = [];
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries) {
		var headerInfo = timelineEntry.getElementsByClassName("note-header-info")[0];
		if(!headerInfo)
			continue;
		var user = headerInfo.getElementsByClassName("note-header-author-name")[0].textContent;
		if(user.toLowerCase() == "jenkins builder")
			jenkinsEntries.push(timelineEntry);
	}
	for (let i = 0; i < jenkinsEntries.length - 3; i++) {
		jenkinsEntries[i].classList.add("${HIDE_OLD_JENKINS_CSS}");
	}`
	chrome.tabs.executeScript({code: script});
	saveSetCheckboxValue(HIDE_OLD_JENKINS_ELEMENT);
}

function showOldJenkins() {
	var script = `
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries) {
		if(timelineEntry.classList.contains("${HIDE_OLD_JENKINS_CSS}"))
			timelineEntry.classList.remove("${HIDE_OLD_JENKINS_CSS}")
	}
	`
	chrome.tabs.executeScript({code: script});
	saveClearCheckboxValue(HIDE_OLD_JENKINS_ELEMENT);
}

function hideOldCommits() {
	var script = `
	var commitEntries = [];
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries) {
		if(!timelineEntry.classList.contains("system-note"))
			continue;
		var message = timelineEntry.getElementsByClassName("system-note-message")[0];
		if(!message.getElementsByTagName("span")[0].textContent.includes("commit"))
			continue;
		commitEntries.push(timelineEntry);
	}
	
	for (let i = 0; i < commitEntries.length - 3; i++) {
		commitEntries[i].classList.add("${HIDE_OLD_COMMITS_CSS}");
	}`
	chrome.tabs.executeScript({code: script});
	saveSetCheckboxValue(HIDE_OLD_COMMITS_ELEMENT);
}

function showOldCommits() {
	var script = `
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries){
		if(timelineEntry.classList.contains("${HIDE_OLD_COMMITS_CSS}"))
			timelineEntry.classList.remove("${HIDE_OLD_COMMITS_CSS}");
	}`
	chrome.tabs.executeScript({code: script});
	saveClearCheckboxValue(HIDE_OLD_COMMITS_ELEMENT);
}

function hideRebuilds() {
	var script = `
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries){
		const noteText = timelineEntry.getElementsByClassName("note-text");
		if(noteText.length == 1){
			if(noteText[0].getElementsByTagName("p")[0].textContent.includes("REBUILD"))
				timelineEntry.classList.add("${HIDE_REBUILDS_CSS}");
		}
	}
	`
	chrome.tabs.executeScript({code: script});
	saveSetCheckboxValue(HIDE_REBUILDS_ELEMENT)
}

function showRebuilds() {
	var script = `
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries){
		if(timelineEntry.classList.contains("${HIDE_REBUILDS_CSS}"))
			timelineEntry.classList.remove("${HIDE_REBUILDS_CSS}");
	}`
	chrome.tabs.executeScript({code: script});
	saveClearCheckboxValue(HIDE_REBUILDS_CSS);
}

function hideOldEverything() {
	var script = `
	var timelineEntries = document.getElementsByClassName("timeline-entry");
	for (let timelineEntry of timelineEntries){
		var time = timelineEntry.getElementsByTagName("time");
		if(time.length > 0){
			var text = time[0].textContent; // :-( time stamp can't be parsed
			if(text.includes("week") || text.includes("month") || text.includes("year") || text.includes("days") && !text.includes("2 days") && !text.includes("3 days"))
				timelineEntry.classList.add("${HIDE_OLD_EVERYTHING_CSS}");
		}
	}
	`
	chrome.tabs.executeScript({code: script});
}

function showOldEverything() {
	var script = `
		var timelineEntries = document.getElementsByClassName("timeline-entry");
		for (let timelineEntry of timelineEntries){
			if(timelineEntry.classList.contains("${HIDE_OLD_EVERYTHING_CSS}"))
				timelineEntry.classList.remove("${HIDE_OLD_EVERYTHING_CSS}")
		}
	`
	chrome.tabs.executeScript({code: script});
}

function settingName(elementName){
	return `${currentTabId}_${elementName}`;
}

function saveSetCheckboxValue(elementName) {
	// chrome.storage.local.get([settingName(elementName)],
	// 	function (result) {
	// 		if (!!result[settingName(elementName)])
	// 			return;
	// 		chrome.storage.local.set({ [settingName(elementName)]: true });
	// 	});
}

function saveClearCheckboxValue(elementName) {
	// chrome.storage.local.get([settingName(elementName)], 
	// 	function(result) {
	// 		if(!result[settingName(elementName)])
	// 			return;
	// 		chrome.storage.local.remove([settingName(elementName)])
	// 	})
}

Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }
    return a;
};