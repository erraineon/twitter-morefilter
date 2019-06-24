chrome.tabs.onUpdated.addListener(
    function (tabId, changeInfo, tab) {
        if (/^https:\/\/twitter\.com\/.*/.test(changeInfo.url)) {
            browser.tabs.sendMessage(tabId, 'twitter-url-update');
        }
    }
);