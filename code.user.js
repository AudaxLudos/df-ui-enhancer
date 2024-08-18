// ==UserScript==
// @name        Dead frontier Market Enhancer
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0
// @description Enhances the market and inventory UI for Dead Frontier 3D
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/market-enhancer
// @supportURL  https://github.com/AudaxLudos/market-enhancer/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/market-enhancer/main/code.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/market-enhancer/main/code.user.js
// ==/UserScript==

(function () {
	"use strict";

	let globalData = unsafeWindow.globalData;
	let userVars = unsafeWindow.userVars;
	let tradeData = {};

	function serializeObject(obj) {
		var pairs = [];
		for (var prop in obj) {
			if (!obj.hasOwnProperty(prop)) {
				continue;
			}
			pairs.push(prop + "=" + obj[prop]);
		}
		return pairs.join("&");
	}

	function makeRequest(requestUrl, requestParams, callbackFunc, callBackParams) {
		return new Promise((resolve) => {
			var xhttp = new XMLHttpRequest();
			var payload = null;
			xhttp.onreadystatechange = function () {
				if (this.readyState == 4 && this.status == 200) {
					//Invoke the callback with the request response text and some parameters, if any were supplied
					//then resolve the Promise with the callback's reponse
					let callbackResponse = null;
					if (callbackFunc != null) {
						callbackResponse = callbackFunc(this.responseText, callBackParams);
					}
					if (callbackResponse == null) {
						callbackResponse = true;
					}
					resolve(callbackResponse);
				}
			};

			payload = serializeObject(requestParams);

			xhttp.open("POST", requestUrl, true);
			xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhttp.setRequestHeader("x-requested-with", "SilverScriptRequest");
			payload = "hash=" + unsafeWindow.hash(payload) + "&" + payload;
			xhttp.send(payload);
		});
	}

	function makeScrapRequest(itemId, inventorySlot, itemScrapValue) {
		let requestParams = {};
		requestParams["pagetime"] = userVars["pagetime"];
		requestParams["templateID"] = "0";
		requestParams["sc"] = userVars["sc"];
		requestParams["creditsnum"] = "0";
		requestParams["buynum"] = "0";
		requestParams["expected_itemprice"] = "";
		requestParams["expected_itemtype2"] = "";
		requestParams["expected_itemtype"] = itemId; // item code/id
		requestParams["itemnum2"] = "";
		requestParams["itemnum"] = inventorySlot; // inventory slot
		requestParams["price"] = itemScrapValue; // item scrap price
		requestParams["action"] = "scrap";
		requestParams["gv"] = "21";
		requestParams["userID"] = userVars["userID"];
		requestParams["password"] = userVars["password"];

		makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", requestParams, null, null);
		unsafeWindow.playSound("shop_buysell");
	}

	function updateInventory() {
		unsafeWindow.updateIntoArr(unsafeWindow.flshToArr(inventoryData, "DFSTATS_"), unsafeWindow.userVars);
		unsafeWindow.populateInventory();
		unsafeWindow.populateCharacterInventory();
		unsafeWindow.updateAllFields();
	}

	function scrapInventoryHelper() {
		let inventoryHolder = unsafeWindow.inventoryHolder;
		if (inventoryHolder == null) {
			return;
		}


		let scrapAllButton = document.createElement("button");
		scrapAllButton.id = "customScrapAllButton";
		scrapAllButton.className = "opElem";
		scrapAllButton.innerHTML = "Scrap Inventory";
		inventoryHolder.appendChild(scrapAllButton);

		scrapAllButton.addEventListener()
	}

	function closePopupAds() {
		let popupElement = document.getElementById("DFAdBoxData");
		if (popupElement) {
			document.getElementById("fancybox-overlay").style.display = "none";
			document.getElementById("fancybox-wrap").style.display = "none";
			document.getElementById("DFAdBoxData").parentElement.remove();
		}
	}

	function modifyUserInterface() {
		if (unsafeWindow.jQuery == null) {
			return;
		}
		if (window.location.href.indexOf("index.php?page=21") > -1) {
			// Should only run when going out to inner city
			// Hide flash/unity web player custom browser link
			$("body > table:nth-child(1)").hide();
			// Modify back to outpost button
			$("form[action*='hotrods/hotfunctions.php'] > input[id=backToOutpostSubmit]").val("Return to Outpost");
			$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.maxWidth = "fit-content";
			$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.marginLeft = "auto";
			$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.marginRight = "auto";
			$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.top = "-520px";
			// Hide open chat button
			$("a[href='https://discordapp.com/invite/deadfrontier2']").parent().hide();
			// Hide main footer
			$("body > table:nth-child(2) > tbody > tr > td > table").hide();
			return;
		}
		// Hide facebook like button
		$("iframe[src*='https://www.facebook.com/plugins/like.php?href=https://www.facebook.com/OfficialDeadFrontier/&width&layout=button_count&action=like&show_faces=false&share=true&height=35&appId=']").hide();
		// Hide social links
		$("body > table:nth-child(2)").hide();
		// Hide main footer
		$("body > table:nth-child(3)").hide();
	}

	function addOutpostQuickLinks() {
		let outpostLinks = [
			{ name: "Marketplace", id: "35" },
			{ name: "Yard", id: "24" },
			{ name: "Bank", id: "15" },
			{ name: "Storage", id: "50" },
			{ name: "Crafting", id: "59" },
			{ name: "Vendor", id: "84" },
			{ name: "Records", id: "22" },
			{ name: "Gambling Den", id: "49" },
			{ name: "Fast Travel", id: "61" },
		];
		let mainScreenEdge = $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/right_edge.jpg']").offset();
		if (!mainScreenEdge) {
			return;
		}
		let linksContainer = document.createElement("div");
		linksContainer.id = "customOutpostLinks";
		linksContainer.style.width = "120px";
		linksContainer.style.display = "grid";
		linksContainer.style.rowGap = "5px";
		linksContainer.style.padding = "5px";
		linksContainer.style.border = "1px solid #990000";
		linksContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
		linksContainer.style.position = "absolute";
		linksContainer.style.top = `${mainScreenEdge.top}px`;
		linksContainer.style.right = `${mainScreenEdge.left + 60}px`;
		linksContainer.style.zIndex = "20";

		for (let i in outpostLinks) {
			let linkDiv = document.createElement("div");
			linkDiv.style.textAlign = "center";

			let linkButton = document.createElement("button");
			linkButton.setAttribute("data-page", outpostLinks[i].id);
			linkButton.setAttribute("data-mod", "0");
			linkButton.setAttribute("data-sound", "1");
			linkButton.innerHTML = outpostLinks[i].name;
			linkDiv.appendChild(linkButton);
			linksContainer.appendChild(linkDiv);

			linkButton.addEventListener("click", function (event) {
				// Change page on click
				unsafeWindow.nChangePage(event);
			});
		}

		document.body.appendChild(linksContainer);

		// Adjust window when screen resizes
		window.addEventListener(
			"resize",
			function (event) {
				let mainScreenEdge = $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/right_edge.jpg']").offset();
				let linksContainer = document.getElementById("customOutpostLinks");
				linksContainer.style.top = `${mainScreenEdge.top}px`;
				linksContainer.style.right = `${mainScreenEdge.left + 60}px`;
			},
			true
		);
	}

	function addQuickMarketSearchListener() {
		inventoryHolder.addEventListener("dblclick", (event) => {
			if (unsafeWindow.marketHolder == null) {
				return;
			}

			const searchField = document.getElementById("searchField");
			const searchButton = document.getElementById("makeSearch");
			const searchCategory = document.getElementById("categoryChoice");

			if (searchField == null || searchButton == null || searchCategory == null) {
				return;
			}

			if (event.target.classList.contains("item")) {
				document.getElementById("cat").innerHTML = "Everything";
				searchCategory.setAttribute("data-catname", "");
				searchCategory.setAttribute("data-cattype", "");
				searchField.value = "";
				let itemName = globalData[event.target.getAttribute("data-type").replace(/_.*/, "")].name;
				searchField.value = itemName;
				searchButton.disabled = false;
				searchButton.click();
			}
		});
	}

	function addClearSearchOnCategoryClickListener() {
		inventoryHolder.addEventListener("click", (event) => {
			if (unsafeWindow.marketHolder == null) {
				return;
			}

			const searchField = document.getElementById("searchField");

			if (searchField == null) {
				return;
			}

			if (event.target.id == "cat" || event.target.id == "categoryChoice") {
				searchField.value = "";
			}
		});
	}

	setTimeout(() => {
		closePopupAds();
		addOutpostQuickLinks();
		modifyUserInterface();

		if (unsafeWindow.inventoryHolder != null) {
			addQuickMarketSearchListener();
			addClearSearchOnCategoryClickListener();
			if (window.location.href.indexOf("index.php?page=24") > -1) {
				test();
			}
		}
	}, 500);
})();
