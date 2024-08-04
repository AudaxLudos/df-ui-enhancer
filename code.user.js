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
	function modifyUserInterface() {
		if (unsafeWindow.jQuery == null) {
			return;
		}
		if (window.location.href.indexOf("index.php?page=21") > -1) {
			// Should only run when going out to inner city
			// Hide flash/unity web player custom browser link
			$("body > table:nth-child(1)").hide();
			// Modify back to outpost button
			$("form[action*='hotrods/hotfunctions.php'] > input[id=backToOutpostSubmit]").val('Return to Outpost');
			$("form[action*='hotrods/hotfunctions.php'] > input[id=backToOutpostSubmit]").val('Return to Outpost');
			$("form[action*='hotrods/hotfunctions.php']").parent().css({"max-width": "fit-content", "margin-left": "auto", "margin-right": "auto", "top": "-520px"});
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

	setTimeout(() => {
		modifyUserInterface()
	}, 50);

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