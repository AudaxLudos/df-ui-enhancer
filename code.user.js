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

	var globalData = unsafeWindow.globalData;

	if (unsafeWindow.userVars == null || unsafeWindow.inventoryHolder == null) {
		return
	}

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

			const item = globalData[target.getAttribute("data-type").replace(/_.*/, '')]
			const isMastercraft = target.getAttribute("data-type").includes("stats")
			const quantity = target.getAttribute("data-quantity")

			if (!item) {
				return
			}

			let element = document.getElementById("itemDataCustom")
			if (element != null && element.dataset.itemId === item.code) {
				// No re-render needed
				return
			}

			const infoContainer = document.createElement('div')
			infoContainer.id = "itemDataCustom"
			infoContainer.style.color = "gray"
			infoContainer.style.fontStyle = "italic"
			infoContainer.classList.add('itemData')
			infoContainer.dataset.itemId = item.code

			let scrapValue = unsafeWindow.scrapValue(item.code, quantity)
			if (isMastercraft) {
				if (item.itemcat == "backpack" && isMastercraft) {
					scrapValue = scrapValue * 1.2 + scrapValue
				} else {
					scrapValue *= 2
				}
			}

			infoContainer.innerHTML = `
			Scrap Value: ${formatCurrency(scrapValue)}
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
			let itemName = globalData[e.target.getAttribute("data-type").replace(/_.*/, '')].name
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
	function formatCurrency(number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(number)
	}
})()