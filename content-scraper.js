// content-scraper.js (Refactored for maintainability and robustness)

/**
 * This file contains functions intended to be executed as content scripts
 * on dating app domains. They are responsible for scraping page data
 * and interacting with the page's DOM.
 *
 * The functions are organized under the `window.datingAppScrapers` namespace
 * to avoid polluting the global scope.
 */

(function() {
    "use strict";

    // --- HELPER FUNCTIONS ---

    /**
     * Parses a Tinder date string into 'YYYY-MM-DD' format.
     * @param {string} dateText - The text content representing the date.
     * @returns {string | null} The formatted date string or null if parsing fails.
     */
    function parseTinderDate(dateText) {
        const today = new Date();
        const text = dateText.toLowerCase().trim();
        const formatDate = (d) => d.toISOString().split('T')[0];

        if (text === 'today') return formatDate(today);
        if (text === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            return formatDate(yesterday);
        }
        
        try {
            const dateOnlyText = text.split(',')[0];
            const parts = dateOnlyText.split('/');
            if (parts.length === 3) {
                const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                const month = parts[0].padStart(2, '0');
                const day = parts[1].padStart(2, '0');
                const isoDate = new Date(`${year}-${month}-${day}`);
                if (!isNaN(isoDate.getTime())) return formatDate(isoDate);
            }
            const parsed = new Date(text);
            if (!isNaN(parsed.getTime())) return formatDate(parsed);
        } catch (e) {
            console.warn('[Scraper Helper] Could not parse Tinder date:', dateText);
        }
        return null;
    }

    /**
     * Parses a Bumble date string into 'YYYY-MM-DD' format.
     * Ignores relative time strings like "8 hours ago".
     * @param {string} dateText - The text content of the date divider.
     * @returns {string | null} The formatted date string or null.
     */
    function parseBumbleDate(dateText) {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const text = dateText.toLowerCase();
        const formatDate = (d) => d.toISOString().split('T')[0];

        if (text.includes('ago') || text.includes('now') || text.includes(' min') || text.includes(' hr')) {
            return null; // Ignore relative times
        }

        if (text === 'today') return formatDate(today);
        if (text === 'yesterday') return formatDate(yesterday);

        try {
            const parsed = new Date(dateText);
            if (!isNaN(parsed.getTime())) {
                if (parsed.getFullYear() < 2000) {
                    parsed.setFullYear(today.getFullYear());
                }
                return formatDate(parsed);
            }
        } catch (e) { /* Continue */ }
        
        const parts = dateText.replace(/,/g, '').split(' ');
        if (parts.length >= 2) {
            const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
            const monthIndex = monthNames.indexOf(parts[0].toLowerCase());
            const day = parseInt(parts[1], 10);
            let year = today.getFullYear();

            if (parts.length === 3 && !isNaN(parseInt(parts[2], 10))) {
                year = parseInt(parts[2], 10);
            }

            if (monthIndex > -1 && !isNaN(day)) {
                try {
                    const manualDate = new Date(year, monthIndex, day);
                    return formatDate(manualDate);
                } catch (e) {
                    console.warn('[Scraper Helper] Manual date construction failed for:', dateText);
                }
            }
        }

        console.warn('[Scraper Helper] Could not parse Bumble date:', dateText);
        return null;
    }

    /**
     * Parses a "pill" element from Bumble's UI (e.g., interests, basics).
     * @param {HTMLElement} pillElement - The pill element.
     * @returns {{key: string, value: string}}
     */
    function parseBumblePill(pillElement) {
        const value = pillElement.querySelector('.pill__title')?.textContent.trim() || '';
        const img = pillElement.querySelector('img');
        let key = 'interest'; // Default key

        if (img) {
            const src = img.getAttribute('src') || '';
            // First, try the robust regex method
            const match = src.match(/ic_badge_profileChips_dating_([a-zA-Z]+)/);
            if (match && match[1]) {
                // Sanitize key: remove "v2", "v", etc. and convert to readable format
                key = match[1].toLowerCase().replace(/v\d*$/, '');
                key = key.charAt(0).toUpperCase() + key.slice(1); // e.g., "zodiac" -> "Zodiac"
                return { key, value };
            }
        }

        // Fallback: if no image or regex fails, try to use the header of the section
        const sectionHeader = pillElement.closest('div.profile__section')?.querySelector('.profile__section-header');
        if (sectionHeader) {
            key = sectionHeader.textContent.trim();
        } else {
            // Ultimate fallback: use the pill's value as the key if no better key can be found
            key = value;
        }

        return { key, value };
    }

    /**
     * Parses a single section of a Tinder profile.
     * @param {HTMLElement} sectionWrapper - The DOM element for the profile section.
     * @returns {{title: string, content: string, basics: object} | null}
     */
    function pasteTextIntoInput(selector, textToPaste) {
        const messageInput = document.querySelector(selector);
        if (messageInput) {
            messageInput.value = textToPaste;
            messageInput.dispatchEvent(new Event('input', { bubbles: true }));
            messageInput.focus();
        }
    }

    function parseTinderProfileSection(sectionWrapper) {
        const titleElement = sectionWrapper.querySelector('h2');
        if (!titleElement) return null;

        const title = titleElement.textContent.trim();
        const basics = {};
        let content = '';

        // --- ROBUST "ABOUT ME" LOGIC ---
        if (title.toLowerCase() === 'about me') {
            const aboutMeContentElement = titleElement.parentElement.nextElementSibling;
            if (aboutMeContentElement) {
                content = aboutMeContentElement.textContent.trim();
                if (content) basics['About'] = content;
            }
        }
        // Handle "Interests" section
        else if (title.toLowerCase() === 'interests') {
            const interests = Array.from(sectionWrapper.querySelectorAll('li span')).map(el => el.textContent.trim());
            content = interests.join(', ');
            if (content) basics['Interests'] = content;
        }
        // Handle "Looking for" section
        else if (title.toLowerCase() === 'looking for') {
            const lookingForText = sectionWrapper.querySelector('.Typs\\(display-3-strong\\)')?.textContent.trim();
            const relationshipType = sectionWrapper.querySelector('.Bdrs\\(30px\\)')?.textContent.trim();
            const items = [lookingForText, relationshipType].filter(Boolean);
            content = items.join('; ');
            if (lookingForText) basics['Looking for'] = lookingForText;
            if (relationshipType) basics['Relationship Type'] = relationshipType;
        }
        // Handle generic list-based sections (Essentials, Basics, Lifestyle)
        else {
            const items = [];
            sectionWrapper.querySelectorAll('li').forEach(li => {
                const keyEl = li.querySelector('h3');
                const valueEl = li.querySelector('.Typs\\(body-1-regular\\)');
                if (keyEl && valueEl) {
                    const key = keyEl.textContent.trim();
                    const value = valueEl.textContent.trim();
                    items.push(`${key}: ${value}`);
                    basics[key] = value;
                } else {
                    const text = li.textContent.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
                    if (text) items.push(text);
                }
            });
            content = items.join('; ');
        }

        return { title, content, basics };
    }


    // --- SCRAPER DEFINITIONS ---

    const tinderScraper = {
        /**
         * Scrapes the active Tinder chat page for all relevant context.
         * @returns {object} An object containing all scraped data or an error.
         */
        scrapePage: function() {
            console.log('[Tinder Scraper] Starting scrapePage function.');
            const result = {
                myName: "You",
                theirName: "Match",
                theirProfile: "Profile not loaded.",
                isVerified: false,
                matchLocation: "Not specified",
                matchDistance: "Not specified",
                matchOrigin: "Not specified",
                matchBasics: {},
                conversationHistory: [],
                lastMessageStatus: null,
                lastMessageRelativeTime: null,
                isDetailedProfilePage: false,
                myProfile: null,
                scrapedAt: new Date().toISOString(),
                error: null
            };

            try {
                result.isDetailedProfilePage = window.location.pathname.startsWith('/app/profile');

                // If on own profile page, scrape that instead of the chat.
                if (result.isDetailedProfilePage) {
                    console.log('[Tinder Scraper] Detected own profile page. Scraping details.');
                    try {
                        const myProfileParts = [];
                        const aboutMeEl = document.querySelector('h2[data-testid="profile-card-about-me"] + div');
                        if (aboutMeEl) myProfileParts.push(`About Me: ${aboutMeEl.textContent.trim()}`);

                        const interestsContainer = document.querySelector('div[data-testid="profile-card-interests"]');
                        if(interestsContainer) {
                            const interests = Array.from(interestsContainer.querySelectorAll('span')).map(el => el.textContent.trim());
                            myProfileParts.push(`Interests: ${interests.join(', ')}`);
                        }
                        result.myProfile = myProfileParts.join('\n');
                        console.log('[Tinder Scraper] Scraping complete.', result);
                        return result; // Early exit after scraping own profile
                    } catch (e) {
                         console.warn('[Tinder Scraper] Could not scrape own profile.', e);
                         result.myProfile = "Could not parse own profile details.";
                         return result;
                    }
                }


                // --- Scrape My Name ---
                try {
                    const myNameElement = document.querySelector('a[href="/app/profile"] h2');
                    if (myNameElement) result.myName = myNameElement.textContent.trim();
                } catch (e) {
                    console.warn('[Tinder Scraper] Could not scrape my name.', e);
                }

                // --- Scrape Match Info (Header) ---
                try {
                    const chatHeader = document.querySelector('.chat__header');
                    if (chatHeader) {
                        const theirNameElement = chatHeader.querySelector('h1[data-testid="chat-header-name"]');
                        if (theirNameElement) result.theirName = theirNameElement.textContent.trim();

                        const theirAgeElement = chatHeader.querySelector('h1[data-testid="chat-header-name"] + span');
                        if (theirAgeElement) result.matchBasics['Age'] = theirAgeElement.textContent.trim();

                        result.isVerified = !!chatHeader.querySelector('svg[aria-label="Verified profile"]');
                    }
                } catch (e) {
                    console.warn('[Tinder Scraper] Could not scrape match header info.', e);
                }

                // --- Scrape Match Profile Details ---
                try {
                    const profileParts = [`Name: ${result.theirName}, Age: ${result.matchBasics['Age'] || 'Not specified'}`];
                    const profileContainer = document.querySelector('div[data-testid="profile-card-details"]');
                    if (profileContainer) {
                        const sections = profileContainer.querySelectorAll(':scope > div > div');
                        sections.forEach(sectionWrapper => {
                            const parsedData = parseTinderProfileSection(sectionWrapper);
                            if (parsedData && parsedData.content) {
                                profileParts.push(`\n${parsedData.title}:${parsedData.content}`);
                                Object.assign(result.matchBasics, parsedData.basics);
                            }
                        });
                        result.theirProfile = profileParts.join('\n');
                    }
                } catch (e) {
                    console.warn('[Tinder Scraper] Could not scrape match profile details.', e);
                    result.theirProfile = "Could not parse profile details.";
                }

                // --- Scrape Location ---
                try {
                    const locationElement = document.querySelector('div[data-testid="profile-card-details"] div[class*="location"]');
                    if (locationElement) result.matchLocation = locationElement.textContent.trim();
                    result.matchDistance = result.matchLocation;
                } catch(e) {
                    console.warn('[Tinder Scraper] Could not scrape location.', e);
                }


                // --- Scrape Conversation History ---
                try {
                    const chatLogContainer = document.querySelector('div[role="log"]');
                    let currentDate = new Date().toISOString().split('T')[0];

                    const matchMessageElement = chatLogContainer?.querySelector('h1[class*="Typs(display-3-regular)"]');
                    if (matchMessageElement) {
                        const matchText = matchMessageElement.textContent.trim();
                        const match = matchText.match(/you matched with .* on (.*)/i);
                        if (match && match[1]) {
                            const date = parseTinderDate(match[1]);
                            if (date) currentDate = date;
                        }
                    }

                    const allChatNodes = chatLogContainer?.querySelectorAll(':scope > *');
                    const history = [];

                    allChatNodes?.forEach(node => {
                        if (node.tagName === 'TIME') {
                            const dateText = node.textContent.trim();
                            const parsedDate = parseTinderDate(dateText);
                            if (parsedDate) currentDate = parsedDate;
                            return;
                        }

                        if (node.getAttribute('role') === 'article') {
                            const messageText = node.querySelector('span[data-testid="chat-message-text-content"]')?.textContent.trim();
                            if (!messageText) return;

                            const isMyMessage = node.parentElement.style.textAlign === 'right';
                            const role = isMyMessage ? 'user' : 'assistant';

                            const lastMessage = history.length > 0 ? history[history.length - 1] : null;

                            if (lastMessage && lastMessage.role === role && lastMessage.date === currentDate) {
                                lastMessage.content += `. ${messageText}`;
                            } else {
                                history.push({ role, content: messageText, date: currentDate });
                            }
                        }
                    });
                    result.conversationHistory = history;

                    // --- Scrape Last Message Status ---
                    const sentMessages = chatLogContainer?.querySelectorAll('div[role="article"]');
                    if (sentMessages && sentMessages.length > 0) {
                        const lastSentMessageContainer = sentMessages[sentMessages.length - 1];
                        if(lastSentMessageContainer.parentElement.style.textAlign === 'right') {
                            const statusElement = lastSentMessageContainer.querySelector('div[class*="msg-status-icon"]'); // A guess for status icon
                            if (statusElement) result.lastMessageStatus = statusElement.getAttribute('aria-label') || 'Sent';
                        }
                    }
                } catch (e) {
                    console.warn('[Tinder Scraper] Could not scrape conversation history.', e);
                }

                console.log('[Tinder Scraper] Scraping complete.', result);
                return result;

            } catch (e) {
                console.error('[Tinder Scraper] A critical error occurred during scraping:', e);
                result.error = `Scraping failed: ${e.message}`;
                return result;
            }
        },

        /**
         * Pastes text into the Tinder message input field.
         * @param {string} textToPaste - The text to paste.
         */
        pasteText: function(textToPaste) {
            const selector = 'textarea[placeholder="Type a message"]';
            pasteTextIntoInput(selector, textToPaste);
        }
    };

    const bumbleScraper = {
        /**
         * Scrapes the active Bumble chat page for all relevant context.
         * @returns {object} An object containing all scraped data or an error.
         */
        scrapePage: function() {
            console.log('[Bumble Scraper] Starting scrapePage function.');
            const result = {
                myName: "Me",
                theirName: "Match",
                theirProfile: "Match profile not visible.",
                isVerified: false,
                matchLocation: "Not specified",
                matchDistance: "Not specified",
                matchOrigin: "Not specified",
                matchBasics: {},
                conversationHistory: [],
                lastMessageRelativeTime: null,
                isDetailedProfilePage: false,
                myProfile: null,
                scrapedAt: new Date().toISOString(),
                error: null
            };

            try {
                result.isDetailedProfilePage = !!document.querySelector('section[data-qa-role="settings-section-about"]');
                result.myName = document.querySelector('[data-qa-role="sidebar-profile-name"]')?.textContent.trim() || document.querySelector('.sidebar-profile__name')?.textContent.trim() || "Me";

                if (result.isDetailedProfilePage) {
                    console.log('[Bumble Scraper] Detected detailed profile page. Scraping own profile.');
                    try {
                        const profileSections = document.querySelectorAll('section[data-qa-role^="settings-section"]');
                        const myProfileParts = [];
                        profileSections.forEach(section => {
                            const titleEl = section.querySelector('h2');
                            const title = titleEl ? titleEl.textContent.trim() : 'Section';
                            const contentEl = section.querySelector('p, [data-qa-role="profile-field-text-value"]');
                            const content = contentEl ? contentEl.textContent.trim() : '';
                            if (content) myProfileParts.push(`${title}: ${content}`);
                        });
                        result.myProfile = myProfileParts.join('\n');
                    } catch (e) {
                        console.warn('[Bumble Scraper] Could not scrape own profile.', e);
                        result.myProfile = "Could not parse own profile details.";
                    }
                } else {
                    console.log('[Bumble Scraper] Detected chat page. Proceeding with full scrape.');
                    
                    try {
                        const theirProfilePane = document.querySelector('aside.page__profile.is-expanded .profile');
                        if (theirProfilePane) {
                            const profileParts = [];
                            const nameEl = theirProfilePane.querySelector('[data-qa-role="profile-name"]') || theirProfilePane.querySelector('.profile__name');
                            const ageEl = theirProfilePane.querySelector('[data-qa-role="profile-age"]') || theirProfilePane.querySelector('.profile__age');
                            result.theirName = nameEl?.textContent.trim() || "Match";
                            const age = ageEl?.textContent.replace(',', '').trim();
                            result.isVerified = !!theirProfilePane.querySelector('.profile__verify span[data-qa-icon-name="badge-feature-verification"]');
                            profileParts.push(`\nName: ${result.theirName}, Age: ${age}`);

                            const about = theirProfilePane.querySelector('[data-qa-role="profile-bio"]')?.textContent.trim() || theirProfilePane.querySelector('.profile__about')?.textContent.trim();
                            if (about) profileParts.push(`About Them:${about}`);
                            result.matchLocation = theirProfilePane.querySelector('.location-widget__town')?.textContent.trim() || "Not specified";
                            result.matchDistance = theirProfilePane.querySelector('.location-widget__distance')?.textContent.trim() || "Not specified";
                            result.matchOrigin = theirProfilePane.querySelector('.location-widget__pill .pill__title')?.textContent.trim() || "Not specified";
                            const promptNodes = theirProfilePane.querySelectorAll('.profile__section--answer');
                            const prompts = Array.from(promptNodes).map(s => {
                                const q = s.querySelector('.profile-answer__title')?.textContent.trim();
                                const a = s.querySelector('.profile-answer__text')?.textContent.trim();
                                return (q && a) ? `- ${q}: ${a}` : null;
                            }).filter(Boolean);

                            if(prompts.length > 0) profileParts.push(`Their Profile Prompts:\n${prompts.join('; ')}`);
                            const pillNodes = theirProfilePane.querySelectorAll('.profile__badges .pill[data-qa-role="pill"]');
                            const basicsList = [];
                            pillNodes.forEach(pill => {
                                const { key, value } = parseBumblePill(pill);
                                result.matchBasics[key] = value;
                                basicsList.push(`${key}: ${value}`);
                            });

                            if (basicsList.length > 0) profileParts.push(`Their Basics & Interests:\n${basicsList.join('; ')}`);
                            result.theirProfile = profileParts.join('\n');
                        }
                    } catch (e) {
                        console.error('[Bumble Scraper] Error scraping match profile:', e);
                        result.theirProfile = `Could not fully parse match profile. Error: ${e.message}`;
                    }

                    if (result.theirName === "Match") {
                        const nameInHeader = document.querySelector('.messages-header__name-link')?.textContent.trim();
                        if (nameInHeader) result.theirName = nameInHeader;
                    }

                    try {
                        const messageListEl = document.querySelector('[data-qa-role="message-list"]') || document.querySelector('.messages-list');
                        if (messageListEl) {
                            let currentDateString = new Date().toISOString().split('T')[0];
                            const tempHistory = [];
                            const allNodes = messageListEl.querySelectorAll('.message-group-date, .message');

                            allNodes.forEach(node => {
                                if (node.classList.contains('message-group-date')) {
                                    const dateText = node.textContent.trim();
                                    const newDateFound = parseBumbleDate(dateText);
                                    if (newDateFound) {
                                        currentDateString = newDateFound;
                                    }
                                    return;
                                }

                                if (node.classList.contains('message')) {
                                    const role = node.classList.contains('message--in') ? 'assistant' : 'user';
                                    const content = node.querySelector('.message-bubble__text')?.textContent.trim();
                                    if (content) {
                                        tempHistory.push({ role, content, date: currentDateString });
                                    }
                                }
                            });

                            result.conversationHistory = tempHistory.reduce((acc, msg) => {
                                const lastMessage = acc.length > 0 ? acc[acc.length - 1] : null;
                                if (lastMessage?.role === msg.role && lastMessage?.date === msg.date) {
                                    lastMessage.content += `. ${msg.content}`;
                                } else {
                                    acc.push(msg);
                                }
                                return acc;
                            }, []).slice(-20);

                            const lastMessageGroup = messageListEl.querySelector('.message-group:last-of-type');
                            if (lastMessageGroup) {
                                const timeStampNode = lastMessageGroup.querySelector('.message-group__timestamp');
                                if (timeStampNode && timeStampNode.textContent.includes('ago')) {
                                    result.lastMessageRelativeTime = timeStampNode.textContent.trim();
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[Bumble Scraper] Error scraping conversation history:', e);
                        result.conversationHistory = [];
                    }
                }

                console.log('[Bumble Scraper] Scraping complete.', result);
                return result;

            } catch (e) {
                console.error('[Bumble Scraper] A critical error occurred during scraping:', e);
                result.error = `Scraping failed: ${e.message}`;
                return result;
            }
        },

        /**
         * Pastes text into the Bumble message input field.
         * @param {string} textToPaste - The text to paste.
         */
        pasteText: function(textToPaste) {
            const selector = 'textarea[data-qa-role="message-input"], textarea.textarea__input[placeholder^="Start chatting..."]';
            pasteTextIntoInput(selector, textToPaste);
        }
    };

    // --- ATTACH TO WINDOW ---
    // This is the public API for the content script.
    window.datingAppScrapers = {
        scrapeTinderPage: tinderScraper.scrapePage,
        pasteTextIntoTinderInput: tinderScraper.pasteText,
        scrapeBumblePage: bumbleScraper.scrapePage,
        pasteTextIntoBumbleInput: bumbleScraper.pasteText
    };

})();