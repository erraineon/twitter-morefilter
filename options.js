let mutedUsersList = document.querySelector("#mutedUsers");

function initializeOptions() {
    while (mutedUsersList.firstChild) {
        mutedUsersList.removeChild(mutedUsersList.firstChild);
    }
    chrome.storage.local.get(function (settings) {
        for (let key in settings) {
            if (key.endsWith("-settings")) {
                let userSettings = settings[key];
                if (userSettings.textMuted) {
                    console.log(key);
                    console.log(userSettings);
                    let li = document.createElement("li");
                    let span = document.createElement("span");
                    span.innerHTML = `@${userSettings.screenName}&nbsp;`;
                    let unmuteButton = document.createElement("a");
                    unmuteButton.setAttribute("href", "#");
                    unmuteButton.className = "close"
                    unmuteButton.innerHTML = "&times;";
                    unmuteButton.onclick = () => {
                        userSettings.textMuted = false;
                        browser.storage.local.set({ [key]: userSettings }, initializeOptions);
                    };
                    li.appendChild(span);
                    li.appendChild(unmuteButton);
                    mutedUsersList.appendChild(li);
                }
            }
        }
    });
}

initializeOptions();