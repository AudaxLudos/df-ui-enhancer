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

	const itemsList = {}
	const ammoList = {}
	const weaponsList = {}
	const armourList = {}

	if (unsafeWindow.userVars == null || unsafeWindow.inventoryHolder == null) {
		return
	}

	const maxItems = unsafeWindow.userVars.GLOBALDATA_maxitems
	const itemData = [
		"code",
		"itemtype",
		"scrapvalue"
	]
	const maxAmmo = 30
	const ammoData = [
		"code",
		"itemtype",
		"amountper"
	]
	const maxWeapons = unsafeWindow.userVars.GLOBALDATA_maxweapons
	const weaponData = [
		"code",
		"itemtype",
		"pro_req",
		"melee",
		"rare"
	]
	const maxArmour = unsafeWindow.userVars.GLOBALDATA_maxarmour
	const armourData = [
		"code",
		"itemtype",
		"str"
	]
	const foodMedsScrapValues = {
		"5": { scrapvalue: 15 },
		"15": { scrapvalue: 45 },
		"25": { scrapvalue: 140 },
		"35": { scrapvalue: 245 },
		"45": { scrapvalue: 505 },
		"75": { scrapvalue: 1605 }
	}
	const clothingScrapValues = {
		"0": { scrapvalue: 50 },
		"5": { scrapvalue: 63 },
		"10": { scrapvalue: 150 },
		"15": { scrapvalue: 275 },
		"20": { scrapvalue: 450 },
		"25": { scrapvalue: 675 },
		"30": { scrapvalue: 1400 },
		"35": { scrapvalue: 1888 },
		"40": { scrapvalue: 2450 },
		"45": { scrapvalue: 3088 },
		"50": { scrapvalue: 5050 },
		"55": { scrapvalue: 6100 },
		"60": { scrapvalue: 7012 },
	}
	const meleeScrapValues = {
		"0": { scrapvalue: 50 },
		"5": { scrapvalue: 63 },
		"10": { scrapvalue: 100 },
		"15": { scrapvalue: 163 },
		"20": { scrapvalue: 450 },
		"25": { scrapvalue: 675 },
		"30": { scrapvalue: 950 },
		"35": { scrapvalue: 1275 },
		"40": { scrapvalue: 1650 },
		"50": { scrapvalue: 2550 },
		"60": { scrapvalue: 5450 },
		"70": { scrapvalue: 7400 },
		"80": { scrapvalue: 9650 },
		"90": { scrapvalue: 12200 },
		"100": { scrapvalue: 20050 },
		"105": { scrapvalue: 22100 },
		"110": { scrapvalue: 24250 },
		"120": { scrapvalue: 28850 }
	}
	const firearmScrapValues = {
		"5": { scrapvalue: 75 },
		"10": { scrapvalue: 150 },
		"15": { scrapvalue: 275 },
		"20": { scrapvalue: 850 },
		"25": { scrapvalue: 1300 },
		"30": { scrapvalue: 1850 },
		"35": { scrapvalue: 2500 },
		"40": { scrapvalue: 3250 },
		"45": { scrapvalue: 4100 },
		"50": { scrapvalue: 5050 },
		"55": { scrapvalue: 6100 },
		"60": { scrapvalue: 10850 },
		"70": { scrapvalue: 14750 },
		"75": { scrapvalue: 16925 },
		"80": { scrapvalue: 19250 },
		"90": { scrapvalue: 24350 },
		"95": { scrapvalue: 27125 },
		"100": { scrapvalue: 40050 },
		"105": { scrapvalue: 44150 },
		"110": { scrapvalue: 48450 },
		"120": { scrapvalue: 57650 },
	}
	const armourScrapValues = {
		"5": { scrapvalue: 1050 },
		"15": { scrapvalue: 3450 },
		"25": { scrapvalue: 11050 },
		"35": { scrapvalue: 19450 },
		"45": { scrapvalue: 40250 },
		"75": { scrapvalue: 128250 }
	}

	/***************************
	 *
	 * Get weapons data
	 *
	 ***************************/
	for (let i = 1; i <= maxWeapons; i++) {
		let code = unsafeWindow.userVars[`GLOBALDATA_weapon${i}_code`]
		let isMelee = unsafeWindow.userVars[`GLOBALDATA_weapon${i}_melee`]
		weaponsList[code] = {}

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

		for (let j = 0; j < itemData.length; j++) {
			let data = itemData[j]
			if (data == "itemtype") {
				itemsList[code][data] = "item"
				continue
			}
			if (data == "scrapvalue") {
				if (foodRestore > 0) {
					itemsList[code][data] = `${findScrapValue(foodMedsScrapValues, level)}`
				} else if (healthRestore > 0) {
					itemsList[code][data] = `${findScrapValue(foodMedsScrapValues, level)}`
				} else if (isCloth != null) {
					itemsList[code][data] = `${findScrapValue(clothingScrapValues, level)}`
				} else {
					itemsList[code][data] = unsafeWindow.userVars[`GLOBALDATA_item${i}_scrapvalue`]
				}
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
	var originalInfoCard = unsafeWindow.infoCard || null
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

			let scrapValue = 0
			if (data.itemtype == "weapon") {
				if (data.melee == 1) {
					scrapValue = data.rare == 2 ? 50000 : findScrapValue(meleeScrapValues, data.pro_req)
				} else {
					scrapValue = data.rare == 2 ? 100000 : findScrapValue(firearmScrapValues, data.pro_req)
				}
			} else if (data.itemtype == "armour") {
				scrapValue = findScrapValue(armourScrapValues, data.str)
			} else if (data.itemtype == "ammo") {
				scrapValue = calculateAmmoScrapValue(data.amountper, quantity)
			} else {
				scrapValue = data.scrapvalue
			}
			if (isMastercraft) {
				scrapValue *= 2
			}

			infoContainer.innerHTML = `
			<br/>
			Scrap value: ${formatCurrency(scrapValue)}
			`

			infoBox.appendChild(infoContainer)
		}.bind(unsafeWindow)
		inventoryHolder.addEventListener("mousemove", unsafeWindow.infoCard, false)
	}

	inventoryHolder.addEventListener("dblclick", (e) => {
		if (e.target.classList.contains('item')) {
			const searchField = document.getElementById("searchField")
			const searchButton = document.getElementById("makeSearch")
			const searchCategory = document.getElementById("categoryChoice")

			if (searchField == null || searchButton == null || searchCategory == null) {
				return
			}

			document.getElementById("categoryChoice").innerHTML = "Everything"
			searchCategory.setAttribute("data-catname", "")
			searchCategory.setAttribute("data-cattype", "")
			searchField.value = ''
			searchField.value = getItemName()
			searchButton.disabled = false
			searchButton.click()
		}
	})

	/***************************
	 *
	 * Utility functions
	 *
	 ***************************/
	function getItemName() {
		const infobox = document.querySelector('#infoBox > .itemName')
		return infobox.innerText
	}

	function findScrapValue(levelsList, level) {
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
		if (weaponsList[itemCode] != null) {
			return weaponsList[itemCode]
		} else if (armourList[itemCode] != null) {
			return armourList[itemCode]
		} else if (ammoList[itemCode] != null) {
			return ammoList[itemCode]
		} else {
			return itemsList[itemCode]
		}
	}

	function calculateAmmoScrapValue(amountPer, quantity) {
		return amountPer * quantity * 2
	}
})()