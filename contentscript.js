// constants
const TIMELINE_SELECTOR = "#stream-items-id";
const TWEET_SELECTOR = "div.tweet";
const ADAPTIVE_MEDIA_CONTAINER_SELECTOR = ".AdaptiveMediaOuterContainer";
const DATA_USER_ID_ATTRIBUTE_NAME = "data-user-id";
const DATA_SCREEN_NAME_ATTRIBUTE_NAME = "data-screen-name";
const CONVERSATION_MODULE_CLASS_NAME = "conversation-module";
const USER_ACTIONS_SELECTOR = ".UserActions > div.user-actions";
const DROPDOWN_SELECTOR = ".dropdown";
const MUTE_USER_TEXT_ITEM_CLASS_NAME = "mute-user-text-item";
const MUTE_USER_ITEM_SELECTOR = ".mute-user-item";
const PROFILENAV_SELECTOR = ".ProfileNav";
const DEFAULT_USER_SETTINGS = {
    textMuted: false
};

let timelineObserver = null;

// utility functions
let remove = element => element.parentNode.removeChild(element);
let getIsTweetTextOnly = tweet => tweet.querySelector(ADAPTIVE_MEDIA_CONTAINER_SELECTOR) == null;
let getUserKey = userId => `${userId}-settings`;
let getUserSettings = (settings, userId) => settings[getUserKey(userId)] || Object.assign({}, DEFAULT_USER_SETTINGS);
let getIsUserMuted = (settings, userId) => getUserSettings(settings, userId).textMuted;

// remove tweets if they have only text and if the user is muted
function removeTweetIfTextOnly(tweet) {
    let isTextOnly = getIsTweetTextOnly(tweet);
    if (isTextOnly) {
        let userId = tweet.getAttribute(DATA_USER_ID_ATTRIBUTE_NAME);
        let isUserMuted = getIsUserMuted(cachedSettings, userId);
        if (isUserMuted) {
            // if tweets are part of a conversation and removing them would make the conversation empty,
            // remove the whole conversation
            let conversationModule = tweet.parentNode.parentNode;
            let isPartOfConvo = conversationModule.classList.contains(CONVERSATION_MODULE_CLASS_NAME);
            tweet.parentNode.removeChild(tweet);
            let noTweetsLeft = conversationModule.querySelector(TWEET_SELECTOR) == null;
            if (isPartOfConvo && noTweetsLeft) {
                let actualTweetNode = conversationModule.parentNode;
                remove(actualTweetNode);
            }
        }
    }
}


// set the timeline observer for new tweets and remove already existing ones that match the filter
function observeTimeline(tl) {
    if (timelineObserver) timelineObserver.disconnect();
    timelineObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.querySelector) {
                    let tweets = node.querySelectorAll(TWEET_SELECTOR);
                    for (var i = 0; i < tweets.length; i++) {
                        var tweet = tweets[i];
                        removeTweetIfTextOnly(tweet);
                    }
                }
            });
        });
    });
    timelineObserver.observe(tl, { childList: true });
    let currentTweets = tl.querySelectorAll(TWEET_SELECTOR);
    currentTweets.forEach(function (tweet) { removeTweetIfTextOnly(tweet); });
}

// wait for the timeline to be added to immediately filter tweets instead of waiting for the DOM to load
function observePage() {
    let pageObserver = new MutationObserver(mutations => {
        for (var i = 0; i < mutations.length; i++) {
            let tl = document.querySelector(TIMELINE_SELECTOR);
            if (tl !== null) {
                pageObserver.disconnect();
                observeTimeline(tl);
                break;
            }
        }
    });
    pageObserver.observe(document, { childList: true, subtree: true });
}

function hookUserDropdown() {
    let userActionsDiv = document.querySelector(USER_ACTIONS_SELECTOR);
    let isOnUserPage = userActionsDiv !== null;
    if (isOnUserPage) {
        let userId = userActionsDiv.getAttribute(DATA_USER_ID_ATTRIBUTE_NAME);
        let screenName = userActionsDiv.getAttribute(DATA_SCREEN_NAME_ATTRIBUTE_NAME);
        let userKey = getUserKey(userId);
        function initializeMuteButton() {
            chrome.storage.local.get([userKey],
                function (settings) {
                    let userSettings = getUserSettings(settings, userId);
                    let isMuted = userSettings.textMuted;
                    let text = isMuted ? "Unmute text-only tweets" : "Mute text-only tweets";
                    let dropdown = userActionsDiv.querySelector(DROPDOWN_SELECTOR);
                    let muteTextOnlyTweetsButton = dropdown.querySelector(`.${MUTE_USER_TEXT_ITEM_CLASS_NAME}`);
                    let muteButtonAlreadyExists = muteTextOnlyTweetsButton != null;
                    if (!muteButtonAlreadyExists) {
                        // use an existing dropdown entry for reference
                        let referenceButton = dropdown.querySelector(MUTE_USER_ITEM_SELECTOR);
                        muteTextOnlyTweetsButton = referenceButton.cloneNode(true);
                        referenceButton.parentNode.insertBefore(muteTextOnlyTweetsButton, referenceButton);
                        // as class name dictates the action of the button, change it to a custom class
                        // so that the click behavior can be overridden by the extension
                        muteTextOnlyTweetsButton.classList = MUTE_USER_TEXT_ITEM_CLASS_NAME;
                        muteTextOnlyTweetsButton.style.display = 'block';
                    }

                    let button = muteTextOnlyTweetsButton.querySelector("button");
                    button.innerText = text;
                    button.onclick = function () {
                        userSettings.textMuted = !userSettings.textMuted;
                        userSettings.screenName = screenName;
                        chrome.storage.local.set({ [userKey]: userSettings },
                            function () {
                                // close the dropdown
                                dropdown.classList.remove("open");
                                // reload settings and reset state
                                initializeMuteButton();
                            });
                    };
                });
        }
        initializeMuteButton();
    }
}

function initializeScript() {
    chrome.storage.local.get(function(settings) {
        // cache settings in a global variable on a per-page context
        cachedSettings = settings;
        observePage();
        hookUserDropdown();
    });
}

// sometimes Twitter navigates between pages without reloading
// use a background navigation observer that pushes update messages to reload this script
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg === 'twitter-url-update') {
        initializeScript();
    }
});

initializeScript();

// as the script runs before the document loads, wait until the DOM loads to hook onto the dropdown
document.addEventListener('DOMContentLoaded', hookUserDropdown, false);
