// content-scraper.js (Corrected with Robust Profile Scraping & Window Attachment)

/**
 * This file contains functions intended to be executed as content scripts
 * on dating app domains. They are responsible for scraping page data
 * and interacting with the page's DOM.
 */

// --- Functions are attached to the window object to be callable from the extension's popup script ---

// TINDER SCRAPER & PASTER

/**
 * Scrapes the active Tinder chat page for all relevant context.
 * This function is injected and executed directly on the page.
 * @returns {object} An object containing all scraped data or an error.
 */
export function scrapeTinderPage() {
    console.log('[Tinder Scraper] Starting scrapeTinderPage function.');
    try {
        // ... (The entire inner logic of scrapeTinderPage remains exactly the same) ...
        /**
         * Parses a single section within the main profile container. It identifies the
         * section type by its H2 title and applies specific logic for each.
         * @param {HTMLElement} sectionWrapper - The direct child div of the profile container.
         * @returns {{title: string, content: string, basics: object} | null}
         */
        function parseProfileSection(sectionWrapper) {
            const titleElement = sectionWrapper.querySelector('h2');
            if (!titleElement) return null;

            const title = titleElement.textContent.trim();
            const basics = {};
            let content = '';

            // --- ROBUST "ABOUT ME" LOGIC ---
            if (title.toLowerCase() === 'about me') {
                // The bio text is in the sibling div to the one containing the h2
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
                        const text = li.textContent.trim().replace(/\n/g, ' ').replace(/\s+/g, ' '); // Clean up text
                        if (text) items.push(text);
                    }
                });
                content = items.join('; ');
            }
            
            return { title, content, basics };
        }
        
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
                console.warn('[Tinder Scraper] Could not parse date:', dateText);
            }
            return null;
        }

        const myNameElement = document.querySelector('a[title="My Profile"] h2 span');
        const myName = myNameElement ? myNameElement.textContent.trim() : "You";

        const theirNameElement = document.querySelector('.chatProfile h1 span:first-child');
        const theirName = theirNameElement ? theirNameElement.textContent.trim() : "Match";
        
        const theirAgeElement = document.querySelector('.chatProfile h1 span.Typs\\(display-2-regular\\)');
        const theirAge = theirAgeElement ? theirAgeElement.textContent.trim() : "Not specified";

        const isVerified = !!document.querySelector('.chatProfile h1 svg[title="Verified!"]');

        const profileParts = [`Name: ${theirName}, Age: ${theirAge}`];
        const matchBasics = {};
        
        // --- ROBUST PROFILE SCRAPING ---
        const profileContainer = document.querySelector('div[class*="Bgc(--color--background-sparks-profile)"]');
        if (profileContainer) {
            // Select each direct child div which wraps a section
            const sections = profileContainer.querySelectorAll(':scope > div > div');
            sections.forEach(sectionWrapper => {
                const parsedData = parseProfileSection(sectionWrapper);
                if (parsedData && parsedData.content) {
                    profileParts.push(`\n${parsedData.title}:${parsedData.content}`);
                    Object.assign(matchBasics, parsedData.basics);
                }
            });
        }
        
        const theirProfile = profileParts.join('\n');

        let matchLocation = "Not specified";
        const locationElement = Array.from(document.querySelectorAll('.chatProfile .Typs\\(body-1-regular\\)'))
                                     .find(el => el.textContent.includes('kilometers away') || el.textContent.includes('miles away'));
        if (locationElement) {
            matchLocation = locationElement.textContent.trim();
        }

        const conversationHistory = [];
        const chatLogContainer = document.querySelector('div[role="log"]');
        let currentDate = new Date().toISOString().split('T')[0];
        
        const matchMessageElement = chatLogContainer?.querySelector('h1.Typs\\(display-3-regular\\)');
        if (matchMessageElement) {
            const matchText = matchMessageElement.textContent.trim();
            const match = matchText.match(/you matched with .* on (.*)/i);
            if (match && match[1]) {
                const date = parseTinderDate(match[1]);
                if (date) currentDate = date;
            }
        }

        const allChatNodes = chatLogContainer?.querySelectorAll(':scope > *');

        allChatNodes?.forEach(node => {
            if (node.tagName === 'TIME') {
                const dateText = node.textContent.trim();
                const parsedDate = parseTinderDate(dateText);
                if (parsedDate) {
                    currentDate = parsedDate;
                }
                return;
            }

            if (node.tagName === 'DIV' && node.getAttribute('role') === 'article') {
                const messageText = node.querySelector('span.text')?.textContent.trim();
                if (!messageText) return;

                const isMyMessage = node.classList.contains('Ta(e)');
                const role = isMyMessage ? 'user' : 'assistant';
                
                const lastMessage = conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1] : null;

                if (lastMessage && lastMessage.role === role && lastMessage.date === currentDate) {
                    lastMessage.content += `. ${messageText}`;
                } else {
                    conversationHistory.push({
                        role,
                        content: messageText,
                        date: currentDate
                    });
                }
            }
        });

        let lastMessageStatus = null;
        const sentMessages = chatLogContainer?.querySelectorAll('div[role="article"].Ta\\(e\\)');
        if (sentMessages && sentMessages.length > 0) {
            const lastSentMessageContainer = sentMessages[sentMessages.length - 1];
            const statusElement = lastSentMessageContainer.querySelector('div[class*="msg__status"]');
            if (statusElement) {
                lastMessageStatus = statusElement.textContent.trim();
            }
        }

        const result = {
            myName,
            theirName,
            theirProfile,
            isVerified,
            matchLocation,
            matchDistance: matchLocation,
            matchOrigin: "Not specified",
            matchBasics,
            conversationHistory,
            lastMessageStatus,
            lastMessageRelativeTime: null,
            isDetailedProfilePage: false,
            myProfile: null,
            scrapedAt: new Date().toISOString(),
            error: null
        };

        console.log('[Tinder Scraper] Scraping complete. Final data object:', result);
        return result;

    } catch (e) {
        console.error('[Tinder Scraper] A critical error occurred during scraping:', e);
        return { error: `Scraping failed: ${e.message}` };
    }
}

export function pasteTextIntoTinderInput(textToPaste) {
    const messageInput = document.querySelector('textarea[placeholder="Type a message"]');
    if (messageInput) {
        messageInput.value = textToPaste;
        messageInput.dispatchEvent(new Event('input', { bubbles: true }));
        messageInput.focus();
    }
}


// ===================================================================================
// BUMBLE SCRAPER & PASTER
// ===================================================================================

export function scrapeBumblePage() {
    console.log('[Bumble Scraper] Starting scrapeBumblePage function.');
    try {
        // ... (The entire inner logic of scrapeBumblePage remains exactly the same) ...
        function parsePill(pillElement) {
            const value = pillElement.querySelector('.pill__title')?.textContent.trim() || '';
            const img = pillElement.querySelector('img');
            let key = 'interest';
            if (img) {
                const src = img.getAttribute('src') || '';
                const match = src.match(/ic_badge_profileChips_dating_([a-zA-Z]+)v2\.png/);
                if (match && match[1]) {
                    key = match[1].toLowerCase().replace(/v$/, '');
                }
            }
            return { key, value };
        }

        function parseDateDivider(dateText, today, yesterday) {
            const text = dateText.toLowerCase();
            const formatDate = (d) => d.toISOString().split('T')[0];

            // This function now intentionally returns null for relative times,
            // so the scraper can ignore them and continue using the last known absolute date.
            if (text.includes('ago') || text.includes('now') || text.includes(' min') || text.includes(' hr')) {
                return null;
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
                        console.warn('[Bumble Scraper] Manual date construction failed for:', dateText);
                    }
                }
            }

            console.warn('[Bumble Scraper] Could not parse date divider:', dateText);
            return null;
        }

        const isDetailedProfilePage = !!document.querySelector('section[data-qa-role="settings-section-about"]');
        const myName = document.querySelector('[data-qa-role="sidebar-profile-name"]')?.textContent.trim() || document.querySelector('.sidebar-profile__name')?.textContent.trim() || "Me";
        
        let myProfile = null, theirProfile = "Match profile not visible.", theirName = "Match", isVerified = false,
            matchLocation = "Not specified", matchDistance = "Not specified", matchOrigin = "Not specified", 
            matchBasics = {}, conversationHistory = [], lastMessageRelativeTime = null;

        if (isDetailedProfilePage) {
            console.log('[Bumble Scraper] Detected detailed profile page. Skipping chat/match scrape.');
        } else {
            console.log('[Bumble Scraper] Detected chat page. Proceeding with full scrape.');
            
            try {
                const theirProfilePane = document.querySelector('aside.page__profile.is-expanded .profile');
                if (theirProfilePane) {
                    const profileParts = [];
                    const nameEl = theirProfilePane.querySelector('[data-qa-role="profile-name"]') || theirProfilePane.querySelector('.profile__name');
                    const ageEl = theirProfilePane.querySelector('[data-qa-role="profile-age"]') || theirProfilePane.querySelector('.profile__age');
                    theirName = nameEl?.textContent.trim() || "Match";
                    const age = ageEl?.textContent.replace(',', '').trim();
                    isVerified = !!theirProfilePane.querySelector('.profile__verify span[data-qa-icon-name="badge-feature-verification"]');
                    profileParts.push(`\nName: ${theirName}, Age: ${age}`);
					
                    const about = theirProfilePane.querySelector('[data-qa-role="profile-bio"]')?.textContent.trim() || theirProfilePane.querySelector('.profile__about')?.textContent.trim();
                    if (about) profileParts.push(`About Them:${about}`);
                    matchLocation = theirProfilePane.querySelector('.location-widget__town')?.textContent.trim() || "Not specified";
                    matchDistance = theirProfilePane.querySelector('.location-widget__distance')?.textContent.trim() || "Not specified";
                    matchOrigin = theirProfilePane.querySelector('.location-widget__pill .pill__title')?.textContent.trim() || "Not specified";
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
                        const { key, value } = parsePill(pill);
                        matchBasics[key] = value;
                        basicsList.push(`${key}: ${value}`);
                    });
					
                    if (basicsList.length > 0) profileParts.push(`Their Basics & Interests:\n${basicsList.join('; ')}`);
                    theirProfile = profileParts.join('\n');
                }
            } catch (e) {
                console.error('[Bumble Scraper] Error scraping match profile:', e);
                theirProfile = `Could not fully parse match profile. Error: ${e.message}`;
            }

            if (theirName === "Match") {
                const nameInHeader = document.querySelector('.messages-header__name-link')?.textContent.trim();
                if (nameInHeader) theirName = nameInHeader;
            }

            console.log('[Bumble Scraper] --- Scraping Conversation History (Top-Down) ---');
            try {
                const messageListEl = document.querySelector('[data-qa-role="message-list"]') || document.querySelector('.messages-list');
                if (messageListEl) {
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    
                    // --- MAJOR REFACTOR: Consistent Top-Down Scraping ---
                    // Start with today's date as the default. This correctly handles recent messages
                    // with relative timestamps (e.g., "8 hours ago") that appear before an absolute date divider.
                    let currentDateString = today.toISOString().split('T')[0];
                    const tempHistory = [];

                    const allNodes = messageListEl.querySelectorAll('.message-group-date, .message');
                    
                    allNodes.forEach(node => {
                        // If we find a date divider, try to parse it.
                        if (node.classList.contains('message-group-date')) {
                            const dateText = node.textContent.trim();
                            // parseDateDivider will return a valid date string or null for relative times.
                            const newDateFound = parseDateDivider(dateText, today, yesterday);
                            if (newDateFound) {
                                // If it's an absolute date, update our current date for all subsequent messages.
                                currentDateString = newDateFound;
                            }
                            return; // This node is just a divider, skip to the next one.
                        }

                        // If it's a message, assign the current date we have stored.
                        if (node.classList.contains('message')) {
                            const role = node.classList.contains('message--in') ? 'assistant' : 'user';
                            const content = node.querySelector('.message-bubble__text')?.textContent.trim();
                            if (content) {
                                // Push to a temporary array using the last known absolute date.
                                tempHistory.push({ role, content, date: currentDateString });
                            }
                        }
                    });
                    
                    // Post-process to group consecutive messages from the same user on the same day.
                    conversationHistory = tempHistory.reduce((acc, msg) => {
                        const lastMessage = acc.length > 0 ? acc[acc.length - 1] : null;
                        if (lastMessage?.role === msg.role && lastMessage?.date === msg.date) {
                            lastMessage.content += `. ${msg.content}`;
                        } else {
                            acc.push(msg);
                        }
                        return acc;
                    }, []).slice(-20); // Keep the last 20 message groups.
                    
                    const lastMessageGroup = messageListEl.querySelector('.message-group:last-of-type');
                    if (lastMessageGroup) {
                        const timeStampNode = lastMessageGroup.querySelector('.message-group__timestamp');
                        if (timeStampNode && timeStampNode.textContent.includes('ago')) {
                            lastMessageRelativeTime = timeStampNode.textContent.trim();
                        }
                    }
                }
            } catch (e) {
                console.error('[Bumble Scraper] Error scraping conversation history:', e);
                conversationHistory = [];
            }
        }

        const result = { 
            myName, 
            theirName, 
            theirProfile,
            isVerified,
            matchLocation, 
            matchDistance, 
            matchOrigin, 
            matchBasics, 
            conversationHistory,
            lastMessageRelativeTime,
            isDetailedProfilePage,
            myProfile,
            scrapedAt: new Date().toISOString(),
            error: null 
        };

        console.log('[Bumble Scraper] Scraping complete. Final data object:', result);
        return result;

    } catch (e) {
        console.error('[Bumble Scraper] A critical error occurred during scraping:', e);
        return { error: `Scraping failed: ${e.message}` };
    }
}

export function pasteTextIntoBumbleInput(textToPaste) {
    const messageInput = document.querySelector('textarea[data-qa-role="message-input"]') || document.querySelector('textarea.textarea__input[placeholder^="Start chatting..."]');
    if (messageInput) {
        messageInput.value = textToPaste;
        messageInput.dispatchEvent(new Event('input', { bubbles: true }));
        messageInput.focus();
    }
}