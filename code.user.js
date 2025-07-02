// ==UserScript==
// @name        Dead frontier UI Enhancer
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0
// @description Enhances the market and inventory UI for Dead Frontier 3D
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/df-ui-enhancer
// @supportURL  https://github.com/AudaxLudos/df-ui-enhancer/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/df-ui-enhancer/main/code.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/df-ui-enhancer/main/code.user.js
// ==/UserScript==

(function () {
	"use strict";

	let globalData = unsafeWindow.globalData;
	let userVars = unsafeWindow.userVars;
	let itemsTradeData = {};

	////////////////////////////
	// UTILITY FUNCTIONS
	////////////////////////////
	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function formatCurrency(number) {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(number);
	}

	function formatOrdinalNum(i) {
		let j = i % 10,
			k = i % 100;
		if (j === 1 && k !== 11) {
			return i + "st";
		}
		if (j === 2 && k !== 12) {
			return i + "nd";
		}
		if (j === 3 && k !== 13) {
			return i + "rd";
		}
		return i + "th";
	}

	function serializeObject(obj) {
		let pairs = [];
		for (let prop in obj) {
			if (!obj.hasOwnProperty(prop)) {
				continue;
			}
			pairs.push(prop + "=" + obj[prop]);
		}
		return pairs.join("&");
	}

	function makeRequest(requestUrl, requestParams, controller, callback, callbackParams) {
		const payload = `hash=${unsafeWindow.hash(serializeObject(requestParams))}&${serializeObject(requestParams)}`;
		return fetch(requestUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"x-requested-with": "SilverScriptRequest",
			},
			body: payload,
			signal: controller ? controller.signal : null,
		})
			.then((response) => response.text())
			.then((response) => {
				if (!response) {
					throw "Connection error";
				}
				return callback ? callback(response, callbackParams) : true;
			});
	}

	function makeInventoryRequest(creditsNum, buyNum, renameTo, itemPrice, itemType1, itemType2, slot1, slot2, itemScrapValue, action, controller) {
		let requestParams = {};
		requestParams["pagetime"] = userVars["pagetime"];
		requestParams["templateID"] = "0";
		requestParams["sc"] = userVars["sc"];
		requestParams["creditsnum"] = creditsNum;
		requestParams["buynum"] = buyNum;
		requestParams["renameto"] = renameTo;
		requestParams["expected_itemprice"] = itemPrice;
		requestParams["expected_itemtype2"] = itemType2;
		requestParams["expected_itemtype"] = itemType1;
		requestParams["itemnum2"] = slot2;
		requestParams["itemnum"] = slot1;
		requestParams["price"] = itemScrapValue;
		requestParams["action"] = action;
		requestParams["gv"] = "21";
		requestParams["userID"] = userVars["userID"];
		requestParams["password"] = userVars["password"];

		return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", requestParams, controller, updateInventory, null);
	}

	function makeGetStorageRequest() {
		let requestParams = {};
		requestParams["pagetime"] = userVars["pagetime"];
		requestParams["sc"] = userVars["sc"];
		requestParams["userID"] = userVars["userID"];
		requestParams["password"] = userVars["password"];

		let updateStorage = (storageData) => {
			unsafeWindow.storageBox = unsafeWindow.flshToArr(storageData);
			unsafeWindow.populateStorage();
			unsafeWindow.updateAllFieldsBase();
		};

		return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/get_storage.php", requestParams, null, updateStorage, null);
	}

	function makeWithdrawRequest(amount) {
		let requestParams = {};
		requestParams["withdraw"] = amount;
		requestParams["sc"] = userVars["sc"];
		requestParams["userID"] = userVars["userID"];
		requestParams["password"] = userVars["password"];

		let updateMarketAndBank = (cashData) => {
			unsafeWindow.playSound("bank");
			let cashFields = cashData.split("&");
			let newBankCash = cashFields[1].split("=")[1];
			let newHeldCash = cashFields[2].split("=")[1];
			userVars["DFSTATS_df_cash"] = newHeldCash;
			userVars["DFSTATS_df_bankcash"] = newBankCash;
			unsafeWindow.updateAllFields();
			let itemDisplay = document.getElementById("itemDisplay");
			itemDisplay.scrollTop = 0;
			itemDisplay.scrollLeft = 0;
			unsafeWindow.search();
		};

		return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/bank.php", requestParams, null, updateMarketAndBank, null);
	}

	function makeMarketSearchRequest(searchName, searchType, profession, search, callback) {
		let requestParams = {};
		requestParams["pagetime"] = userVars["pagetime"];
		requestParams["tradezone"] = userVars["DFSTATS_df_tradezone"];
		requestParams["searchname"] = searchName;
		requestParams["memID"] = "";
		requestParams["searchtype"] = searchType;
		requestParams["profession"] = profession;
		requestParams["category"] = "";
		requestParams["search"] = search;

		return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/trade_search.php", requestParams, null, callback, null);
	}

	function filterServiceResponseText(response) {
		let services = {};
		let responseLength = [...response.matchAll(new RegExp("tradelist_[0-9]+_id_member=", "g"))].length;
		if (response != "") {
			for (let i = 0; i < responseLength; i++) {
				let serviceLevel = parseInt(
					response
						.match(new RegExp("tradelist_" + i + "_level=[0-9]+&"))[0]
						.split("=")[1]
						.match(/[0-9]+/)[0]
				);
				if (services[serviceLevel] == undefined) {
					services[serviceLevel] = [];
				}
				let service = {};
				service["userId"] = parseInt(
					response
						.match(new RegExp("tradelist_" + i + "_id_member=[0-9]+&"))[0]
						.split("=")[1]
						.match(/[0-9]+/)[0]
				);
				service["price"] = parseInt(
					response
						.match(new RegExp("tradelist_" + i + "_price=[0-9]+&"))[0]
						.split("=")[1]
						.match(/[0-9]+/)[0]
				);
				services[serviceLevel].push(service);
			}
		}
		return services;
	}

	function filterItemTradeResponseText(response) {
		let trades = [];
		let responseLength = [...response.matchAll(new RegExp("tradelist_[0-9]+_id_member=", "g"))].length;
		if (response != "") {
			for (let i = 0; i < responseLength; i++) {
				let trade = {};
				trade["tradeId"] = parseInt(
					response
						.match(new RegExp("tradelist_" + i + "_trade_id=[0-9]+&"))[0]
						.split("=")[1]
						.match(/[0-9]+/)[0]
				);
				trade["itemId"] = response
					.match(new RegExp("tradelist_" + i + "_item=[a-zA-Z0-9_ ]+&"))[0]
					.split("=")[1]
					.match(/[a-zA-Z0-9_]+/)[0];
				trade["price"] = parseInt(
					response
						.match(new RegExp("tradelist_" + i + "_price=[0-9]+&"))[0]
						.split("=")[1]
						.match(/[0-9]+/)[0]
				);
				trades.push(trade);
			}
		}
		return trades;
	}

	function updateInventory(inventoryData) {
		unsafeWindow.updateIntoArr(unsafeWindow.flshToArr(inventoryData, "DFSTATS_"), unsafeWindow.userVars);
		unsafeWindow.populateInventory();
		unsafeWindow.populateCharacterInventory();
		unsafeWindow.updateAllFieldsBase();
	}

	function getSuitableFoods() {
		let playerLevel = parseInt(userVars["DFSTATS_df_level"]);
		const foods = Object.values(globalData).filter((value) => value["foodrestore"] > 0);
		const suitableFoods = Object.values(foods).filter((value) => parseInt(value["level"]) <= playerLevel && parseInt(value["noloot"]) != 1 && value["code"] != "mre");

		suitableFoods.forEach((value, index, array) => {
			let foodRestoreRaw = parseInt(value["foodrestore"]);
			let foodRestoreCook = foodRestoreRaw * 3;
			let itemLevel = parseInt(value["level"]);
			if ((playerLevel > itemLevel && itemLevel < 50) || (playerLevel > 70 && itemLevel === 50)) {
				foodRestoreRaw = 3;
				foodRestoreCook = 9;
			}
			if ((playerLevel > itemLevel + 10 && itemLevel < 40) || (playerLevel > 70 && itemLevel === 40)) {
				foodRestoreRaw = 0;
				foodRestoreCook = 1;
			}
			if (parseInt(value["needcook"]) == 0) {
				foodRestoreCook = 0;
			}
			array[index]["foodRestoreRaw"] = foodRestoreRaw;
			array[index]["foodRestoreCook"] = foodRestoreCook;
		});

		return suitableFoods;
	}

	function getUsableFood() {
		let playerHungerPercent = parseInt(userVars["DFSTATS_df_hungerhp"]);
		let suitableFoods = getSuitableFoods();
		let optimalFood = null;
		let cookFood = false;
		let closestHunger = playerHungerPercent;

		for (const value of suitableFoods) {
			const foodRestoreRaw = parseInt(value["foodRestoreRaw"]);
			const foodRestoreCook = parseInt(value["foodRestoreCook"]);

			const totalFoodRaw = playerHungerPercent + foodRestoreRaw;
			const totalFoodCook = playerHungerPercent + foodRestoreCook;

			if (totalFoodRaw <= 100 && totalFoodRaw > closestHunger) {
				optimalFood = value;
				cookFood = false;
				closestHunger = totalFoodRaw;
			}

			if (totalFoodCook <= 100 && totalFoodCook > closestHunger) {
				optimalFood = value;
				cookFood = true;
				closestHunger = totalFoodCook;
			}
		}

		if (optimalFood != null && parseInt(optimalFood["needcook"]) == 0) {
			cookFood = false;
		}

		return [optimalFood, cookFood];
	}

	function getSuitableMeds() {
		let playerLevel = parseInt(userVars["DFSTATS_df_level"]);
		const meds = Object.values(globalData).filter((value) => value["healthrestore"] > 0);
		const suitableMeds = Object.values(meds).filter((value) => parseInt(value["level"]) <= playerLevel && value["code"] != "nerotonin5a");

		suitableMeds.forEach((value, index, array) => {
			let healthRestoreRaw = parseInt(value["healthrestore"]);
			let healthRestoreDoc = healthRestoreRaw * 3;
			let itemLevel = parseInt(value["level"]);
			if ((playerLevel > itemLevel && itemLevel < 50) || (playerLevel > 70 && itemLevel === 50)) {
				healthRestoreRaw = 3;
				healthRestoreDoc = 9;
			}
			if ((playerLevel > itemLevel + 10 && itemLevel < 40) || (playerLevel > 70 && itemLevel === 40)) {
				healthRestoreRaw = 0;
				healthRestoreDoc = 1;
			}
			if (parseInt(value["needdoctor"]) == 0) {
				healthRestoreDoc = 0;
			}
			array[index]["healthRestoreRaw"] = healthRestoreRaw;
			array[index]["healthRestoreDoc"] = healthRestoreDoc;
		});

		return suitableMeds;
	}

	function getUsableMed() {
		let playerHealthPercent = (userVars["DFSTATS_df_hpcurrent"] / userVars["DFSTATS_df_hpmax"]) * 100;
		let suitableMeds = getSuitableMeds();
		let optimalMed = null;
		let adminsterMed = false;
		let closestHealth = playerHealthPercent;

		for (const value of suitableMeds) {
			const healthRestoreRaw = parseInt(value["healthRestoreRaw"]);
			const healthRestoreDoc = parseInt(value["healthRestoreDoc"]);

			const totalHealthRaw = playerHealthPercent + healthRestoreRaw;
			const totalHealthDoc = playerHealthPercent + healthRestoreDoc;

			if (totalHealthRaw <= 100 && totalHealthRaw > closestHealth) {
				optimalMed = value;
				adminsterMed = false;
				closestHealth = totalHealthRaw;
			}

			if (totalHealthDoc <= 100 && totalHealthDoc > closestHealth) {
				optimalMed = value;
				adminsterMed = true;
				closestHealth = totalHealthDoc;
			}
		}

		if (optimalMed != null && parseInt(optimalMed["needdoctor"]) == 0) {
			adminsterMed = false;
		}

		return [optimalMed, adminsterMed];
	}

	function getInventorySlotsWithItem() {
		let validItems = [];
		[...unsafeWindow.inventory.getElementsByClassName("validSlot")]
			.filter((node) => node.hasChildNodes() && !node.classList.contains("locked"))
			.forEach((slotWithItem) => {
				let itemElement = slotWithItem.firstChild;
				let id = itemElement.getAttribute("data-type");
				let quantity = itemElement.getAttribute("data-quantity") ? itemElement.getAttribute("data-quantity") : 1;
				let scrapValue = unsafeWindow.scrapValue(id, quantity);
				validItems.push({
					slot: slotWithItem.getAttribute("data-slot"),
					id: id,
					scrapValue: scrapValue,
				});
			});
		return validItems;
	}

	function loadItemsTradeData() {
		const data = localStorage.getItem("df_itemsTradeData") || JSON.stringify(itemsTradeData);

		try {
			itemsTradeData = JSON.parse(data);
		} catch (error) {
			console.error("Failed to parse items trade data:", error);
			localStorage.setItem("df_itemsTradeData", JSON.stringify(itemsTradeData));
		}
	}

	async function getItemTradeData(itemId) {
		if (itemId in itemsTradeData) {
			if (Date.now() / 1000 - itemsTradeData[itemId]["timestamp"] < 3600) {
				return itemsTradeData[itemId];
			}
		}
		let itemTrades = await makeMarketSearchRequest(encodeURI(globalData[itemId]["name"].substring(0, 15)), "buyinglistitemname", "", "trades", filterItemTradeResponseText);
		itemTrades = await itemTrades.filter((value) => value["itemId"].split("_")[0] == itemId);
		itemTrades = itemTrades.slice(0, 5);
		itemsTradeData[itemId] = {};
		itemsTradeData[itemId]["timestamp"] = Date.now() / 1000;
		itemsTradeData[itemId]["trades"] = itemTrades;
		localStorage.setItem("df_itemsTradeData", JSON.stringify(itemsTradeData));
		return itemsTradeData[itemId];
	}

	////////////////////////////
	// UI ENCHANCERS
	////////////////////////////
	function scrapInventoryHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=24") == -1) {
			return;
		}
		let scrapAllButton = document.createElement("button");
		scrapAllButton.id = "customScrapAllButton";
		scrapAllButton.innerHTML = "Scrap All Items";
		scrapAllButton.classList.add("opElem");
		scrapAllButton.style.top = "418px";
		scrapAllButton.style.left = "410px";
		unsafeWindow.inventoryHolder.appendChild(scrapAllButton);

		scrapAllButton.addEventListener("click", (e) => {
			const controller = new AbortController();
			let validItems = getInventorySlotsWithItem();
			let totalCost = 0;

			validItems.forEach((value) => (totalCost += value["scrapValue"]));

			openYesOrNoPrompt(
				`Are you sure you want to scrap your <span style="color: red;">Inventory</span> for <span style="color: #FFCC00;">${formatCurrency(totalCost)}</span>?`,
				async (e) => {
					if (validItems.length > 0) openPromptWithButton("Scrapping inventory items...", "Cancel", (e) => controller.abort());

					for (const [index, value] of validItems.entries()) {
						try {
							await sleep(Math.random() * (300 - 50) + 50);
							await makeInventoryRequest("0", "0", "", "", value.id, "", value.slot, "", value.scrapValue, "scrap", controller);
							unsafeWindow.playSound("shop_buysell");
							if (index === validItems.length - 1) {
								unsafeWindow.updateAllFields();
								throw "Inventory is empty";
							}
						} catch (error) {
							unsafeWindow.updateAllFields();
							return;
						}
					}
				},
				(e) => unsafeWindow.updateAllFields()
			);
		});
	}

	function storeStorageHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=50") == -1) {
			return;
		}
		let storeInventoryButton = document.createElement("button");
		storeInventoryButton.id = "customStoreInventoryButton";
		storeInventoryButton.innerHTML = "Store All Items";
		storeInventoryButton.classList.add("opElem");
		storeInventoryButton.style.top = "418px";
		storeInventoryButton.style.left = "120px";
		unsafeWindow.inventoryHolder.appendChild(storeInventoryButton);

		storeInventoryButton.addEventListener("click", async (e) => {
			const controller = new AbortController();
			let validItems = getInventorySlotsWithItem();

			if (validItems.length > 0) openPromptWithButton("Storing inventory items to storage...", "Cancel", (e) => controller.abort());

			for (const [index, value] of validItems.entries()) {
				try {
					await sleep(Math.random() * (50 - 0) + 0);
					await makeInventoryRequest("0", "0", "undefined`undefined", "-1", value.id, "", value.slot, `${unsafeWindow.findFirstEmptyStorageSlot() + 40}`, value.scrapValue, "store", controller);
					unsafeWindow.playSound("swap");
					await makeGetStorageRequest();
					if (unsafeWindow.findFirstEmptyStorageSlot() === false) {
						throw "Storage is full";
					} else if (index === validItems.length - 1) {
						unsafeWindow.updateAllFields();
						throw "Inventory is empty";
					}
				} catch (error) {
					unsafeWindow.updateAllFields();
					return;
				}
			}
		});
	}

	function takeStorageHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=50") == -1) {
			return;
		}
		let takeStorageButton = document.createElement("button");
		takeStorageButton.id = "customStoreInventoryButton";
		takeStorageButton.innerHTML = "Take All Items";
		takeStorageButton.classList.add("opElem");
		takeStorageButton.style.top = "71px";
		takeStorageButton.style.left = "120px";
		unsafeWindow.inventoryHolder.appendChild(takeStorageButton);

		takeStorageButton.addEventListener("click", async (e) => {
			const controller = new AbortController();
			const storageSlots = userVars.DFSTATS_df_storage_slots;
			let validItems = [];

			for (let i = 1; i <= storageSlots; i++) {
				if (unsafeWindow.storageBox[`df_store${i}_type`] != null) {
					let slot = i;
					let id = unsafeWindow.storageBox[`df_store${i}_type`];
					let quantity = unsafeWindow.storageBox[`df_store${i}_quantity`].replace(/\D/g, "");
					let scrapValue = unsafeWindow.scrapValue(id, quantity);
					validItems.push({
						slot: slot,
						id: id,
						scrapValue: scrapValue,
					});
				}
			}

			if (validItems.length > 0) openPromptWithButton("Taking storage items to inventory...", "Cancel", (e) => controller.abort());

			for (const [index, value] of validItems.entries()) {
				try {
					await sleep(Math.random() * (50 - 0) + 0);
					await makeInventoryRequest("0", "0", "undefined`undefined", "-1", value.id, "", `${value.slot + 40}`, `${unsafeWindow.findFirstEmptyGenericSlot("inv")}`, value.scrapValue, "take", controller);
					unsafeWindow.playSound("swap");
					await makeGetStorageRequest();
					if (unsafeWindow.findFirstEmptyGenericSlot("inv") === false) {
						throw "Inventory is full";
					} else if (index === validItems.length - 1) {
						unsafeWindow.updateAllFields();
						throw "Storage is empty";
					}
				} catch (error) {
					unsafeWindow.updateAllFields();
					return;
				}
			}
		});
	}

	async function replenishHungerHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=35") == -1) {
			return;
		}
		let hungerElement = document.getElementsByClassName("playerNourishment")[0];
		hungerElement.style.top = "";
		let replenishHungerButton = document.getElementById("replenishHungerButton");
		if (replenishHungerButton != null) {
			replenishHungerButton.remove();
		}
		replenishHungerButton = document.createElement("button");
		replenishHungerButton.id = "replenishHungerButton";
		replenishHungerButton.classList.add("opElem");
		replenishHungerButton.style.left = "37px";
		replenishHungerButton.style.top = "25px";
		replenishHungerButton.innerHTML = "Replenish";
		replenishHungerButton.disabled = true;
		hungerElement.parentElement.appendChild(replenishHungerButton);

		let playerCash = userVars["DFSTATS_df_cash"];
		let inventorySlotNumber = unsafeWindow.findLastEmptyGenericSlot("inv");
		let usableFood = getUsableFood();
		let cookFood = usableFood[1];

		try {
			if (parseInt(userVars["DFSTATS_df_hungerhp"]) >= 100) {
				throw "Nourishment is full";
			}
			if (inventorySlotNumber === false) {
				throw "Inventory is full";
			}

			let availableFoods = await makeMarketSearchRequest(encodeURI(usableFood[0]["name"].substring(0, 15)), "buyinglistitemname", "", "trades", filterItemTradeResponseText);
			if (cookFood) {
				availableFoods = availableFoods.filter((value) => value["itemId"].includes("cooked"));
			}

			if (availableFoods === undefined || availableFoods.length == 0) {
				throw `No ${usableFood[0]["name"]} trades available`;
			}

			let buyableFood = availableFoods[0];

			if (playerCash < buyableFood["price"]) {
				throw "You do not have enough cash";
			}

			replenishHungerButton.disabled = false;
			replenishHungerButton.addEventListener("click", () => {
				openYesOrNoPrompt(
					`Are you sure you want to buy and use <span style="color: red;">${cookFood ? "Cooked " : " "}${usableFood[0]["name"]}</span> for <span style="color: #FFCC00;">${formatCurrency(buyableFood["price"])}</span>?`,
					async (e) => {
						openLoadingPrompt("Replenishing nourishment...");
						try {
							await makeInventoryRequest("undefined", buyableFood["tradeId"], "undefined`undefined", `${buyableFood["price"]}`, "", "", "0", "0", "0", "newbuy", null);
							await makeInventoryRequest("0", "0", "undefined`undefined", "-1", "", usableFood[0]["code"], inventorySlotNumber, "", 0, "newconsume", null);
							unsafeWindow.playSound("eat");
							replenishHungerHelper();
							unsafeWindow.updateAllFields();
						} catch (error) {
							replenishHungerHelper();
							unsafeWindow.updateAllFields();
							return;
						}
					},
					(e) => unsafeWindow.updateAllFields()
				);
			});
		} catch (error) {
			replenishHungerButton.disabled = false;
			replenishHungerButton.addEventListener("click", () => {
				openPromptWithButton(error, "Close", (e) => unsafeWindow.updateAllFields());
			});
		}
	}

	async function restoreHealthHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=35") == -1) {
			return;
		}
		let healthElement = document.getElementsByClassName("playerHealth")[0];
		healthElement.style.top = "";
		let restoreHealthButton = document.getElementById("restoreHealthButton");
		if (restoreHealthButton != null) {
			restoreHealthButton.remove();
		}
		restoreHealthButton = document.createElement("button");
		restoreHealthButton.id = "restoreHealthButton";
		restoreHealthButton.classList.add("opElem");
		restoreHealthButton.style.left = "43px";
		restoreHealthButton.style.top = "25px";
		restoreHealthButton.innerHTML = "Restore";
		restoreHealthButton.disabled = true;
		healthElement.parentElement.appendChild(restoreHealthButton);

		let playerCash = userVars["DFSTATS_df_cash"];
		let inventorySlotNumber = unsafeWindow.findLastEmptyGenericSlot("inv");
		let usableMed = getUsableMed();
		let adminsterMed = usableMed[1];

		try {
			if (parseInt(userVars["DFSTATS_df_hpcurrent"]) >= parseInt(userVars["DFSTATS_df_hpmax"])) {
				throw "Health is full";
			}
			if (inventorySlotNumber === false) {
				throw "Inventory is full";
			}

			let medAdminsterLevel = usableMed[0]["level"] - 5;
			let availableMeds = await makeMarketSearchRequest(encodeURI(usableMed[0]["name"].substring(0, 15)), "buyinglistitemname", "", "trades", filterItemTradeResponseText);

			if (availableMeds === undefined || availableMeds.length == 0) {
				throw `No ${usableMed[0]["name"]} trades available`;
			}

			let buyableMed = availableMeds[0];
			let totalCost = buyableMed["price"];

			if (playerCash < totalCost) {
				throw "You do not have enough cash";
			}

			let usableService = null;
			if (adminsterMed) {
				let availableServices = await makeMarketSearchRequest("", "buyinglist", "Doctor", "services", filterServiceResponseText);
				if (availableServices[medAdminsterLevel] == null) {
					throw `No level ${medAdminsterLevel} doctor services available`;
				}

				usableService = availableServices[medAdminsterLevel][0];

				totalCost += usableService["price"];

				if (playerCash < totalCost) {
					throw "You do not have enough cash";
				}
			}

			restoreHealthButton.disabled = false;
			restoreHealthButton.addEventListener("click", () => {
				openYesOrNoPrompt(
					`Are you sure you want to buy and ${adminsterMed ? "administer" : "use"} <span style="color: red;">${usableMed[0]["name"]}</span> for <span style="color: #FFCC00;">${formatCurrency(totalCost)}</span>?`,
					async (e) => {
						openLoadingPrompt("Restoring health...");
						try {
							await makeInventoryRequest("undefined", buyableMed["tradeId"], "undefined`undefined", `${buyableMed["price"]}`, "", "", "0", "0", "0", "newbuy", null);
							if (adminsterMed) {
								await makeInventoryRequest("0", usableService["userId"], "undefined`undefined", usableService["price"], "", "", inventorySlotNumber, "0", unsafeWindow.getUpgradePrice(), "buyadminister", null);
							} else {
								await makeInventoryRequest("0", "0", "undefined`undefined", "-1", usableMed[0]["code"], "", inventorySlotNumber, "0", "0", "newuse", null);
							}
							unsafeWindow.playSound("heal");
							restoreHealthHelper();
							unsafeWindow.updateAllFields();
						} catch (error) {
							restoreHealthHelper();
							unsafeWindow.updateAllFields();
							return;
						}
					},
					(e) => unsafeWindow.updateAllFields()
				);
			});
		} catch (error) {
			restoreHealthButton.disabled = false;
			restoreHealthButton.addEventListener("click", () => {
				openPromptWithButton(error, "Close", (e) => unsafeWindow.updateAllFields());
			});
		}
	}

	async function repairArmorHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=35") == -1) {
			return;
		}
		let armourElement = document.getElementById("sidebarArmour");
		let repairArmourButton = document.getElementById("repairArmourButton");
		if (repairArmourButton != null) {
			repairArmourButton.remove();
		}
		repairArmourButton = document.createElement("button");
		repairArmourButton.id = "repairArmourButton";
		repairArmourButton.classList.add("opElem");
		repairArmourButton.style.left = "46px";
		repairArmourButton.style.top = "29px";
		repairArmourButton.textContent = "Repair";
		repairArmourButton.disabled = true;
		armourElement.appendChild(repairArmourButton);

		let playerCash = userVars["DFSTATS_df_cash"];
		let playerArmour = userVars["DFSTATS_df_armourtype"];
		let armourData = globalData[playerArmour.split("_")[0]];
		let armourRepairLevel = armourData["shop_level"] - 5;
		let inventorySlotNumber = unsafeWindow.findFirstEmptyGenericSlot("inv");

		try {
			if (playerArmour == "") {
				throw "No equipped armour found";
			}
			if (parseInt(userVars["DFSTATS_df_armourhp"]) >= parseInt(userVars["DFSTATS_df_armourhpmax"])) {
				throw "Armour not in need of repairs";
			}
			if (inventorySlotNumber === false) {
				throw "Inventory is full";
			}

			await makeMarketSearchRequest("", "buyinglist", "Engineer", "services", filterServiceResponseText).then((response) => {
				if (response[armourRepairLevel] == null) {
					throw `No level ${armourRepairLevel} repair service available`;
				}

				let serviceData = response[armourRepairLevel][0];

				if (playerCash < serviceData["price"]) {
					throw "You do not have enough cash";
				}

				repairArmourButton.disabled = false;
				repairArmourButton.addEventListener("click", () => {
					openYesOrNoPrompt(
						`Are you sure you want to repair your <span style="color: red;">${userVars["DFSTATS_df_armourname"]}</span> for <span style="color: #FFCC00;">${formatCurrency(serviceData["price"])}</span>?`,
						async (e) => {
							openLoadingPrompt("Repairing armour...");
							try {
								await makeInventoryRequest("0", "0", "undefined`undefined", "-1", "", userVars["DFSTATS_df_armourtype"], inventorySlotNumber, "34", unsafeWindow.getUpgradePrice(), "newequip", null);
								await makeInventoryRequest("0", serviceData["userId"], "undefined`undefined", serviceData["price"], "", "", inventorySlotNumber, "0", unsafeWindow.getUpgradePrice(), "buyrepair", null);
								unsafeWindow.playSound("repair");
								await makeInventoryRequest("0", "0", "undefined`undefined", "-1", userVars["DFSTATS_df_armourtype"], "", inventorySlotNumber, "34", unsafeWindow.getUpgradePrice(), "newequip", null);
								repairArmorHelper();
								unsafeWindow.updateAllFields();
							} catch (error) {
								repairArmorHelper();
								unsafeWindow.updateAllFields();
							}
						},
						(e) => unsafeWindow.updateAllFields()
					);
				});
			});
		} catch (error) {
			repairArmourButton.disabled = false;
			repairArmourButton.addEventListener("click", () => {
				openPromptWithButton(error, "Close", (e) => unsafeWindow.updateAllFields());
			});
		}
	}

	function marketItemPriceHelper() {
		if (unsafeWindow.inventoryHolder == null) {
			return;
		}
		let origInfoCard = unsafeWindow.infoCard || null;
		if (origInfoCard) {
			unsafeWindow.infoCard = async function (e) {
				origInfoCard(e);
				if (active || pageLock || !allowedInfoCard(e.target)) {
					return;
				}

				let target = e.target;
				let isInventorySlot = true;
				if (e.target.parentNode.classList.contains("fakeItem")) {
					target = e.target.parentNode;
					isInventorySlot = false;
				} else if (e.target.classList.contains("fakeItem")) {
					isInventorySlot = false;
				}

				if (!target.classList.contains("item") && !target.classList.contains("fakeItem")) {
					return;
				}

				const itemId = target.dataset.type?.split("_")[0] || null;
				if (!itemId) {
					return;
				}

				if (isInventorySlot && (globalData[itemId]["no_transfer"] == null || globalData[itemId]["no_transfer"] == "0")) {
					let itemTradeData = await getItemTradeData(itemId);
					let trades = itemTradeData["trades"];
					let itemPricesInfo = document.getElementById("itemPricesInfo");
					if (itemPricesInfo) {
						itemPricesInfo.remove();
					}
					itemPricesInfo = document.createElement("div");
					itemPricesInfo.id = "itemPricesInfo";
					itemPricesInfo.classList.add("itemData");
					if (trades && trades.length > 0) {
						let length = trades.length <= 4 ? trades.length : 4;
						for (let i = 0; i < length; i++) {
							const data = trades[i];
							let tradeInfo = document.createElement("div");
							tradeInfo.innerHTML = `${formatOrdinalNum(i + 1)} Trade: ${formatCurrency(data["price"])}`;
							itemPricesInfo.appendChild(tradeInfo);
						}
					}
					document.getElementById("infoBox").append(itemPricesInfo);
				}
			}.bind(unsafeWindow);
			inventoryHolder.addEventListener("mouseover", unsafeWindow.infoCard, false);
		}
	}

	function marketItemPWithdrawHelper() {
		function updateBuyButton(marketRow) {
			let itemPrice = marketRow.dataset.price;
			if (itemPrice <= parseInt(userVars["DFSTATS_df_cash"])) {
				return;
			}
			let buyButton = marketRow.getElementsByTagName("button")[0] || false;
			if (!buyButton) {
				return;
			}
			let withdrawButton = buyButton.cloneNode(true);
			marketRow.replaceChild(withdrawButton, buyButton);
			withdrawButton.innerHTML = "withdraw";
			withdrawButton.style.left = "576px";
			withdrawButton.disabled = true;
			if (parseInt(userVars["DFSTATS_df_bankcash"]) > itemPrice) {
				withdrawButton.disabled = false;
			}
			withdrawButton.addEventListener("click", makeWithdrawRequest.bind(null, itemPrice));
		}

		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=35") == -1) {
			return;
		}

		let target = document.getElementById("itemDisplay");
		let config = { childList: true, subtree: true };

		let marketListObserver = new MutationObserver((mutationList, observer) => {
			if (unsafeWindow.marketScreen == "buy") {
				for (let mutation of mutationList) {
					if (mutation.addedNodes.length > 0) {
						if (mutation.addedNodes[0].tagName != "BUTTON" && mutation.target.tagName != "BUTTON") {
							updateBuyButton(mutation.addedNodes[0]);
						}
					}
				}
			}
		});

		marketListObserver.observe(target, config);
	}

	function expandInventoryToSidebarHelper() {
		function overrideDisplayPlacementMessage(msg, x, y, type) {
			let gameWindow = document.getElementById("gameWindow");
			let oldInventoryHolder = unsafeWindow.inventoryHolder;
			unsafeWindow.inventoryHolder = gameWindow;
			unsafeWindow.vanillaDisplayPlacementMessage(msg, x, y, type);
			unsafeWindow.inventoryHolder = oldInventoryHolder;
		}

		function overrideFakeItemDrag(e) {
			let gameWindow = document.getElementById("gameWindow");
			let oldInventoryHolder = unsafeWindow.inventoryHolder;
			unsafeWindow.inventoryHolder = gameWindow;
			unsafeWindow.drag(e);
			unsafeWindow.inventoryHolder = oldInventoryHolder;
		}

		if (unsafeWindow.inventoryHolder == null) {
			return;
		}

		let tooltip = document.getElementById("textAddon");
		let newParent = tooltip.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode;
		tooltip.style.position = "absolute";
		tooltip.style.fontFamily = "Courier New,Arial";
		tooltip.style.fontWeight = 600;
		tooltip.style.textAlign = "center";
		tooltip.style.zIndex = 20;
		newParent.id = "gameWindow";
		newParent.style.position = "relative";
		newParent.appendChild(tooltip);

		unsafeWindow.vanillaDisplayPlacementMessage = unsafeWindow.displayPlacementMessage;
		unsafeWindow.displayPlacementMessage = overrideDisplayPlacementMessage;

		unsafeWindow.inventoryHolder.removeEventListener("mousemove", unsafeWindow.drag);
		newParent.addEventListener("mousemove", overrideFakeItemDrag);

		let fakeGrabbedItem = document.getElementById("fakeGrabbedItem");
		fakeGrabbedItem.style.position = "absolute";
		fakeGrabbedItem.style.display = "none";
		fakeGrabbedItem.style.width = "40px";
		fakeGrabbedItem.style.height = "40px";
		fakeGrabbedItem.style.opacity = 0.6;
		newParent.appendChild(fakeGrabbedItem);

		let interactionWindow = document.createElement("div");
		interactionWindow.style.position = "absolute";
		interactionWindow.style.width = "85px";
		interactionWindow.style.height = "270px";
		interactionWindow.style.left = "0px";
		interactionWindow.style.top = "80px";
		interactionWindow.style.backgroundImage = "none";
		interactionWindow.dataset.action = "giveToChar";
		interactionWindow.className = "fakeSlot";
		document.getElementById("sidebar").appendChild(interactionWindow);
	}

	function openLoadingPrompt(message) {
		let prompt = document.getElementById("prompt");
		let gamecontent = document.getElementById("gamecontent");

		prompt.style.display = "block";
		gamecontent.classList.remove("warning");
		gamecontent.innerHTML = `<div style="text-align: center;">${message}</div>`;
	}

	function openPromptWithButton(message, buttonName, buttonCallback) {
		let prompt = document.getElementById("prompt");
		let gamecontent = document.getElementById("gamecontent");

		prompt.style.display = "block";
		gamecontent.classList.remove("warning");
		gamecontent.innerHTML = `<div style="text-align: center;">${message}</div>`;

		let button = document.createElement("button");
		button.textContent = buttonName;
		button.style.position = "absolute";
		button.style.left = "111px";
		button.style.bottom = "8px";
		button.addEventListener("click", buttonCallback);

		gamecontent.append(button);
	}

	function openYesOrNoPrompt(message, yesCallback, noCallback) {
		let prompt = document.getElementById("prompt");
		let gamecontent = document.getElementById("gamecontent");

		prompt.style.display = "block";
		gamecontent.classList.add("warning");
		gamecontent.innerHTML = message;

		let yesButton = document.createElement("button");
		yesButton.style.position = "absolute";
		yesButton.style.left = "86px";
		yesButton.style.bottom = "8px";
		yesButton.innerHTML = "Yes";
		yesButton.addEventListener("click", yesCallback);
		gamecontent.appendChild(yesButton);

		let noButton = document.createElement("button");
		noButton.style.position = "absolute";
		noButton.style.right = "86px";
		noButton.style.bottom = "8px";
		noButton.innerHTML = "No";
		noButton.addEventListener("click", noCallback);
		gamecontent.appendChild(noButton);
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
			if ($("form[action*='hotrods/hotfunctions.php']").parent()[0] != null) {
				$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.maxWidth = "fit-content";
				$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.marginLeft = "auto";
				$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.marginRight = "auto";
				$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.top = "-520px";
			}
			// Hide open chat button
			$("a[href='https://discordapp.com/invite/deadfrontier2']").parent().hide();
			// Hide main footer
			$("body > table:nth-child(2) > tbody > tr > td > table").hide();
			return;
		}
		// Fit everything to current window
		if ($("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/header.jpg']") != null) {
			$("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/header.jpg']").css("background-position", "0px -110px");
			$("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/header.jpg']").parent().height(118);
			$("td[style*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/right_margin.jpg']").css("background-position", "left -110px");
			$("td[style*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/left_margin.jpg']").css("background-position", "right -110px");
		}
		// Hide facebook like button
		$("iframe[src*='https://www.facebook.com/plugins/like.php?href=https://www.facebook.com/OfficialDeadFrontier/&width&layout=button_count&action=like&show_faces=false&share=true&height=35&appId=']").hide();
		// Hide social links
		$("body > table:nth-child(2)").hide();
		// Hide main footer
		$("body > table:nth-child(3)").hide();
	}

	function outpostQuickLinksHelper() {
		if (unsafeWindow.jQuery == null) {
			return;
		}
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

	function quickMarketSearchLHelper() {
		if (unsafeWindow.inventoryHolder == null) {
			return;
		}
		if (unsafeWindow.marketHolder == null) {
			return;
		}
		inventoryHolder.addEventListener("dblclick", (event) => {
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

	////////////////////////////
	// SCRIPT INJECTION
	////////////////////////////
	setTimeout(() => {
		loadItemsTradeData();

		closePopupAds();
		modifyUserInterface();
		outpostQuickLinksHelper();
		expandInventoryToSidebarHelper();
		scrapInventoryHelper();
		storeStorageHelper();
		takeStorageHelper();
		quickMarketSearchLHelper();
		replenishHungerHelper();
		restoreHealthHelper();
		repairArmorHelper();
		marketItemPriceHelper();
		marketItemPWithdrawHelper();
	}, 500);
})();
