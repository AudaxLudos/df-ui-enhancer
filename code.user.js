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
	'use strict'

	/***************************
	 *
	 * Remove popups
	 *
	 ***************************/
	// document.getElementById("fancybox-overlay").style.display = "none"
	// document.getElementById("fancybox-wrap").style.display = "none"
	// document.getElementById("DFAdBoxData").parentElement.remove()

	const globalItemsData = {}
	const itemsList = {}
	const ammoList = {}
	const weaponsList = {}
	const armourList = {}
	const backpacksList = {}

	if (unsafeWindow.userVars == null || unsafeWindow.inventoryHolder == null) {
		return
	}

	const maxItems = unsafeWindow.userVars.GLOBALDATA_maxitems
	const itemData = [
		"code",
		"itemtype",
		"name",
	]
	const maxAmmo = 30
	const ammoData = [
		"code",
		"name",
		"itemtype",
		"amountper"
	]
	const maxWeapons = unsafeWindow.userVars.GLOBALDATA_maxweapons
	const weaponData = [
		"code",
		"name",
		"itemtype",
		"pro_req",
		"melee",
		"rare"
	]
	const maxBackpacks = 30
	const backpackData = [
		"code",
		"name",
		"itemtype",
		"slots"
	]
	const maxArmour = unsafeWindow.userVars.GLOBALDATA_maxarmour
	const armourData = [
		"code",
		"name",
		"itemtype",
		"shop_level"
	]

	/***************************
	 *
	 * Get weapons data
	 *
	 ***************************/
	for (let i = 1; i <= maxWeapons; i++) {
		let code = unsafeWindow.userVars[`GLOBALDATA_weapon${i}_code`]
		weaponsList[code] = {}

		if (code == null) {
			continue
		}

		for (let j = 0; j < weaponData.length; j++) {
			let data = weaponData[j]
			if (data == "itemtype") {
				weaponsList[code][data] = "weapon"
				continue
			}
			weaponsList[code][data] = unsafeWindow.userVars[`GLOBALDATA_weapon${i}_${data}`]
		}
	}
	unsafeWindow.weaponsList = weaponsList

	/***************************
	 *
	 * Get armour data
	 *
	 ***************************/
	for (let i = 1; i <= maxArmour; i++) {
		let code = unsafeWindow.userVars[`GLOBALDATA_armour${i}_code`]
		armourList[code] = {}

		if (code == null) {
			continue
		}


		for (let j = 0; j < armourData.length; j++) {
			let data = armourData[j]
			if (data == "itemtype") {
				armourList[code][data] = "armour"
				continue
			}
			armourList[code][data] = unsafeWindow.userVars[`GLOBALDATA_armour${i}_${data}`]
		}
	}
	unsafeWindow.armourList = armourList

	/***************************
	 *
	 * Get backpacks data
	 *
	 ***************************/
	for (let i = 1; i <= maxBackpacks; i++) {
		let code = unsafeWindow.userVars[`GLOBALDATA_backpack${i}_code`]
		backpacksList[code] = {}

		if (code == null) {
			continue
		}

		for (let j = 0; j < backpackData.length; j++) {
			let data = backpackData[j]
			if (data == "itemtype") {
				backpacksList[code][data] = "backpack"
				continue
			}
			backpacksList[code][data] = unsafeWindow.userVars[`GLOBALDATA_backpack${i}_${data}`]
		}
	}
	unsafeWindow.backpacksList = backpacksList

	/***************************
	 *
	 * Get items data
	 *
	 ***************************/
	for (let i = 1; i <= maxItems; i++) {
		let code = unsafeWindow.userVars[`GLOBALDATA_item${i}_code`]
		let level = unsafeWindow.userVars[`GLOBALDATA_item${i}_level`]
		let foodRestore = unsafeWindow.userVars[`GLOBALDATA_item${i}_foodrestore`]
		let healthRestore = unsafeWindow.userVars[`GLOBALDATA_item${i}_healthrestore`]
		let isCloth = unsafeWindow.userVars[`GLOBALDATA_item${i}_clothingtype`]
		itemsList[code] = {}

		if (code == null) {
			continue
		}

		for (let j = 0; j < itemData.length; j++) {
			let data = itemData[j]
			if (data == "itemtype") {
				itemsList[code][data] = "item"
				continue
			}
			itemsList[code][data] = unsafeWindow.userVars[`GLOBALDATA_item${i}_${data}`]
		}
	}
	unsafeWindow.itemsList = itemsList

	/***************************
	 *
	 * Get ammo data
	 *
	 ***************************/
	for (let i = 1; i <= maxAmmo; i++) {
		let code = unsafeWindow.userVars[`GLOBALDATA_ammo${i}_code`]
		ammoList[code] = {}

		if (code == null) {
			continue
		}

		for (let j = 0; j < itemData.length; j++) {
			let data = ammoData[j]
			if (data == "itemtype") {
				ammoList[code][data] = "ammo"
				continue
			}
			ammoList[code][data] = unsafeWindow.userVars[`GLOBALDATA_ammo${i}_${data}`]
		}
	}
	unsafeWindow.ammoList = ammoList

	/***************************
	 *
	 * Update dead frontier UI
	 *
	 ***************************/
	const infoBox = unsafeWindow.infoBox
	infoBox.style.pointerEvents = "none"
	let originalInfoCard = unsafeWindow.infoCard || null
	if (originalInfoCard) {
		inventoryHolder.removeEventListener("mousemove", originalInfoCard, false)
		unsafeWindow.infoCard = function (e) {
			originalInfoCard(e)

			if (active || pageLock || !allowedInfoCard(e.target)) {
				return
			}
			let target
			if (e.target.parentNode.classList.contains("fakeItem")) {
				target = e.target.parentNode
			} else {
				target = e.target
			}
			if (!target.classList.contains('item') && !target.classList.contains('fakeItem')) {
				return
			}

			const item = target.getAttribute("data-type").replace(/_.*/, '')
			const isMastercraft = target.getAttribute("data-type").includes("stats")
			const quantity = target.getAttribute("data-quantity")

			if (!item) {
				return
			}

			let element = document.getElementById("itemDataCustom")
			if (element != null && element.dataset.itemId === item) {
				// No re-render needed
				return
			}

			const data = getItemData(item)

			if (data == null) {
				return
			}

			const infoContainer = document.createElement('div')
			infoContainer.id = "itemDataCustom"
			infoContainer.style.color = "orange"
			infoContainer.style.fontStyle = "italic"
			infoContainer.classList.add('itemData')
			infoContainer.dataset.itemId = item

			let scrapValue = unsafeWindow.scrapValue(data.code, data.amountPer || 1)
			if (isMastercraft) {
				if (data.itemtype == "backpack" && isMastercraft) {
					scrapValue = scrapValue * 1.2 + scrapValue
				} else {
					scrapValue *= 2
				}
			}

			infoContainer.innerHTML = `
			Scrap value: ${formatCurrency(scrapValue)}
			`

			infoBox.appendChild(infoContainer)
		}.bind(unsafeWindow)
		inventoryHolder.addEventListener("mousemove", unsafeWindow.infoCard, false)
	}

	inventoryHolder.addEventListener("dblclick", (e) => {
		if (unsafeWindow.marketHolder == null) {
			return
		}
		const searchField = document.getElementById("searchField")
		const searchButton = document.getElementById("makeSearch")
		const searchCategory = document.getElementById("categoryChoice")

		if (searchField == null || searchButton == null || searchCategory == null) {
			return
		}

		if (e.target.classList.contains('item')) {
			document.getElementById("cat").innerHTML = "Everything"
			searchCategory.setAttribute("data-catname", "")
			searchCategory.setAttribute("data-cattype", "")
			searchField.value = ''
			let itemName = e.target.getAttribute("data-type").replace(/_.*/, '')
			itemName = getItemData(itemName).name.substring(0, 20);
			searchField.value = itemName
			searchButton.disabled = false
			searchButton.click()
		}
	})

	inventoryHolder.addEventListener("click", (e) => {
		if (unsafeWindow.marketHolder == null) {
			return
		}
		const searchField = document.getElementById("searchField")
		if (searchField == null) {
			return
		}
		if (e.target.id == "cat" || e.target.id == "categoryChoice") {
			searchField.value = ''
		}
	})

	/***************************
	 *
	 * Utility functions
	 *
	 ***************************/
	function getScrapValue(levelsList, level) {
		const keys = Object.keys(levelsList).map(Number).sort((a, b) => a - b)

		for (let i = 0; i < keys.length; i++) {
			if (level < keys[i]) {
				return levelsList[keys[i - 1]].scrapvalue
			}
		}

		return levelsList[keys[keys.length - 1]].scrapvalue // if the value is greater than all keys
	}

	function formatCurrency(number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(number)
	}

	function getItemData(itemCode) {
		return weaponsList[itemCode] || armourList[itemCode] || backpacksList[itemCode] || ammoList[itemCode] || itemsList[itemCode];
	}

	function calculateAmmoScrapValue(amountPer, quantity) {
		return amountPer * quantity * 2
	}
})()