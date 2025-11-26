/**
 * Challenge 2 Survive - Text Adventure Game Engine
 * An old-school MUD-style text adventure with typewriter effects
 */

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        typewriterSpeed: 25,        // ms per character
        typewriterSpeedFast: 5,     // ms when holding tap
        lineDelay: 100,             // ms delay between paragraphs
        choiceDelay: 300,           // ms before showing choices
        saveSlotCount: 3,
        localStorageKey: 'c2s_save_',
        autoSaveKey: 'c2s_autosave'
    };

    // ==================== DOM ELEMENTS ====================
    const DOM = {
        gameContainer: null,
        textOutput: null,
        choicesContainer: null,
        tapIndicator: null,
        continuePrompt: null,
        header: {
            day: null,
            episode: null,
            players: null
        },
        overlays: {
            menu: null,
            status: null,
            name: null,
            save: null
        },
        statusContent: null,
        playerNameInput: null,
        saveSlots: null,
        saveTitle: null
    };

    // ==================== GAME STATE ====================
    let gameState = null;
    let gameContent = null;
    let logoText = '';

    // Typewriter state
    let typewriterState = {
        isTyping: false,
        skipRequested: false,
        currentText: '',
        currentIndex: 0,
        timeoutId: null,
        onComplete: null
    };

    // UI State
    let uiState = {
        isWaitingForContinue: false,
        isSaveMode: true  // true for save, false for load
    };

    // ==================== INITIALIZATION ====================
    async function init() {
        cacheDOMElements();
        setupEventListeners();

        try {
            // Load game content and logo in parallel
            const [content, logo] = await Promise.all([
                loadJSON('challenge2survive_content.json'),
                loadText('logo.text')
            ]);

            gameContent = content;
            logoText = logo;

            // Check for autosave
            const autoSave = loadFromStorage(CONFIG.autoSaveKey);
            if (autoSave) {
                showContinuePrompt(autoSave);
            } else {
                startNewGame();
            }
        } catch (error) {
            console.error('Failed to load game content:', error);
            showError('Failed to load game. Please refresh the page.');
        }
    }

    function cacheDOMElements() {
        DOM.gameContainer = document.getElementById('game-container');
        DOM.textOutput = document.getElementById('text-output');
        DOM.choicesContainer = document.getElementById('choices-container');
        DOM.tapIndicator = document.getElementById('tap-indicator');
        DOM.continuePrompt = document.getElementById('continue-prompt');

        DOM.header.day = document.getElementById('day-display');
        DOM.header.episode = document.getElementById('episode-display');
        DOM.header.players = document.getElementById('players-display');

        DOM.overlays.menu = document.getElementById('menu-overlay');
        DOM.overlays.status = document.getElementById('status-overlay');
        DOM.overlays.name = document.getElementById('name-overlay');
        DOM.overlays.save = document.getElementById('save-overlay');

        DOM.statusContent = document.getElementById('status-content');
        DOM.playerNameInput = document.getElementById('player-name-input');
        DOM.saveSlots = document.getElementById('save-slots');
        DOM.saveTitle = document.getElementById('save-title');
    }

    function setupEventListeners() {
        // Menu buttons
        document.getElementById('menu-btn').addEventListener('click', showMenu);
        document.getElementById('resume-btn').addEventListener('click', hideMenu);
        document.getElementById('save-btn').addEventListener('click', () => showSaveLoad(true));
        document.getElementById('load-btn').addEventListener('click', () => showSaveLoad(false));
        document.getElementById('status-btn').addEventListener('click', showStatus);
        document.getElementById('restart-btn').addEventListener('click', confirmRestart);

        // Status overlay
        document.getElementById('close-status-btn').addEventListener('click', hideStatus);

        // Name input
        document.getElementById('name-submit-btn').addEventListener('click', submitPlayerName);
        DOM.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitPlayerName();
        });

        // Save/Load overlay
        document.getElementById('close-save-btn').addEventListener('click', hideSaveLoad);

        // Tap/click to skip or continue
        DOM.textOutput.addEventListener('click', handleScreenTap);
        DOM.textOutput.addEventListener('touchstart', handleScreenTap, { passive: true });

        // Touch events for mobile tap indicator
        document.addEventListener('touchstart', () => {
            if (typewriterState.isTyping) {
                DOM.tapIndicator.classList.add('visible');
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            DOM.tapIndicator.classList.remove('visible');
        }, { passive: true });

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyPress);
    }

    // ==================== LOADING FUNCTIONS ====================
    async function loadJSON(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        return response.json();
    }

    async function loadText(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        return response.text();
    }

    // ==================== GAME STATE MANAGEMENT ====================
    function createNewGameState() {
        return JSON.parse(JSON.stringify(gameContent.game_state_template));
    }

    function initializeRelationships() {
        // Set starting dispositions from NPC data
        if (gameContent.characters && gameContent.characters.npcs) {
            gameContent.characters.npcs.forEach(npc => {
                if (gameState.relationships.hasOwnProperty(npc.id)) {
                    gameState.relationships[npc.id] = npc.starting_disposition || 0;
                }
            });
        }
    }

    function startNewGame() {
        gameState = createNewGameState();
        initializeRelationships();
        clearTextOutput();
        hideAllOverlays();
        showIntroSequence();
    }

    async function showIntroSequence() {
        // Type out the logo
        await typewriterLogo(logoText);

        // Add some spacing
        await delay(500);

        // Welcome message
        await typeText('\n\nWelcome to Challenge 2 Survive.\n');
        await delay(300);
        await typeText('A text-based reality competition.\n');
        await delay(500);

        // Show name input
        showNameInput();
    }

    function showContinuePrompt(savedGame) {
        clearTextOutput();
        appendText('SAVED GAME FOUND\n\n', 'text-highlight');
        appendText(`Day ${savedGame.day}, Episode ${savedGame.episode}\n`);
        appendText(`Player: ${savedGame.player_name}\n\n`);

        // Show continue/new game choices
        showChoices([
            { text: 'Continue saved game', action: () => loadGameState(savedGame) },
            { text: 'Start new game', action: startNewGame }
        ]);
    }

    // ==================== NODE PROCESSING ====================
    function processNode(nodeId) {
        const node = gameContent.nodes[nodeId];
        if (!node) {
            console.error(`Node not found: ${nodeId}`);
            showError(`Game error: Node "${nodeId}" not found.`);
            return;
        }

        gameState.current_node = nodeId;

        // Update header if node has day/episode info
        if (node.day !== undefined) gameState.day = node.day;
        if (node.episode !== undefined) gameState.episode = node.episode;
        updateHeader();

        // Autosave on significant nodes
        if (node.type === 'narrative' || node.type === 'choice') {
            autoSave();
        }

        // Process based on node type
        switch (node.type) {
            case 'narrative':
                processNarrativeNode(node);
                break;
            case 'choice':
                processChoiceNode(node);
                break;
            case 'branch':
                processBranchNode(node);
                break;
            case 'ending':
                processEndingNode(node);
                break;
            default:
                console.error(`Unknown node type: ${node.type}`);
        }
    }

    async function processNarrativeNode(node) {
        hideChoices();

        // Format and display text
        const formattedText = formatText(node.text, node.speaker);
        await typeText(formattedText);

        // Show continue prompt and wait
        showContinuePromptUI();
        uiState.isWaitingForContinue = true;

        // Store the next node to go to
        typewriterState.onComplete = () => {
            uiState.isWaitingForContinue = false;
            hideContinuePromptUI();
            if (node.next) {
                processNode(node.next);
            }
        };
    }

    async function processChoiceNode(node) {
        hideChoices();

        // Format and display context text
        const formattedText = formatText(node.text, node.speaker);
        await typeText(formattedText);

        // Delay before showing choices
        await delay(CONFIG.choiceDelay);

        // Build choice buttons
        const choices = node.choices.map((choice, index) => ({
            number: index + 1,
            text: choice.text,
            action: () => selectChoice(node, choice)
        }));

        showChoices(choices);
    }

    function processBranchNode(node) {
        const condition = node.condition;
        let nextNode = null;

        switch (condition.type) {
            case 'flag_check':
                const flagValue = gameState.flags[condition.flag];
                nextNode = flagValue ? condition.if_true : condition.if_false;
                break;

            case 'relationship_check':
                const relValue = gameState.relationships[condition.character] || 0;
                if (condition.above !== undefined) {
                    nextNode = relValue > condition.above ? condition.if_true : condition.if_false;
                } else if (condition.below !== undefined) {
                    nextNode = relValue < condition.below ? condition.if_true : condition.if_false;
                }
                break;

            case 'alliance_check':
                const hasAlliance = gameState.alliances.includes(condition.alliance);
                nextNode = hasAlliance ? condition.if_true : condition.if_false;
                break;

            default:
                console.error(`Unknown condition type: ${condition.type}`);
                nextNode = condition.if_false;
        }

        if (nextNode) {
            processNode(nextNode);
        }
    }

    async function processEndingNode(node) {
        hideChoices();

        // Add dramatic pause
        DOM.gameContainer.classList.add('screen-flicker');
        await delay(300);
        DOM.gameContainer.classList.remove('screen-flicker');

        // Format and display ending text
        const formattedText = formatEndingText(node.text);
        await typeText(formattedText);

        // Clear autosave on ending
        clearFromStorage(CONFIG.autoSaveKey);

        // Show play again option
        await delay(1000);
        showChoices([
            { text: 'Play Again', action: startNewGame }
        ]);
    }

    async function selectChoice(node, choice) {
        hideChoices();

        // Display the choice response
        if (choice.response_text) {
            const formattedResponse = formatText(choice.response_text);

            appendText('\n');
            await typeText(formattedResponse);
        }

        // Apply effects
        if (choice.effects) {
            applyEffects(choice.effects);
        }

        // Continue to next node
        if (choice.next) {
            await delay(CONFIG.lineDelay);
            appendDivider();
            processNode(choice.next);
        }
    }

    // ==================== EFFECTS SYSTEM ====================
    function applyEffects(effects) {
        // Relationship changes
        if (effects.relationships) {
            for (const [character, change] of Object.entries(effects.relationships)) {
                if (gameState.relationships.hasOwnProperty(character)) {
                    gameState.relationships[character] = clamp(
                        gameState.relationships[character] + change,
                        -100,
                        100
                    );
                }
            }
        }

        // Flag setting
        if (effects.flags) {
            Object.assign(gameState.flags, effects.flags);
        }

        // Alliance changes
        if (effects.alliances) {
            effects.alliances.forEach(alliance => {
                if (!gameState.alliances.includes(alliance)) {
                    gameState.alliances.push(alliance);
                }
            });
        }

        // Challenge wins
        if (effects.challenge_wins) {
            gameState.challenge_wins += effects.challenge_wins;
        }

        // Elimination wins
        if (effects.elimination_wins) {
            gameState.elimination_wins += effects.elimination_wins;
        }

        // Vote history
        if (effects.vote_history) {
            gameState.vote_history.push(...effects.vote_history);
        }

        // Eliminated players
        if (effects.eliminated) {
            gameState.eliminated_players = effects.eliminated;
        }

        // Active players
        if (effects.active_players) {
            gameState.active_players = effects.active_players;
        }
    }

    // ==================== TEXT FORMATTING ====================
    function formatText(text, speaker = null) {
        // Replace placeholders
        let formatted = text
            .replace(/\[PLAYER_NAME\]/g, gameState.player_name || 'Player')
            .replace(/\[PLAYER\]/g, gameState.player_name || 'Player')
            .replace(/\[CHALLENGE_WINS\]/g, gameState.challenge_wins)
            .replace(/\[ELIMINATION_WINS\]/g, gameState.elimination_wins);

        // Add speaker prefix if present
        if (speaker) {
            const speakerName = getCharacterName(speaker);
            formatted = `[${speakerName.toUpperCase()}]: ${formatted}`;
        }

        return formatted;
    }

    function formatEndingText(text) {
        return text
            .replace(/\[PLAYER_NAME\]/g, gameState.player_name || 'Player')
            .replace(/\[CHALLENGE_WINS\]/g, gameState.challenge_wins)
            .replace(/\[ELIMINATION_WINS\]/g, gameState.elimination_wins);
    }

    function getCharacterName(characterId) {
        if (characterId === 'player') return gameState.player_name || 'You';

        const npc = gameContent.characters.npcs.find(n => n.id === characterId);
        if (npc) return npc.name;

        if (characterId === 'deej') return "DJ 'Deej' Slavin";

        return characterId;
    }

    // ==================== TYPEWRITER EFFECT ====================
    async function typeText(text) {
        return new Promise((resolve) => {
            typewriterState.isTyping = true;
            typewriterState.skipRequested = false;
            typewriterState.currentText = text;
            typewriterState.currentIndex = 0;

            const textElement = document.createElement('div');
            textElement.className = 'text-block';
            DOM.textOutput.appendChild(textElement);

            const cursorElement = document.createElement('span');
            cursorElement.className = 'cursor';

            function typeNextChar() {
                if (typewriterState.skipRequested) {
                    // Complete immediately
                    textElement.innerHTML = processTextForDisplay(text);
                    finishTyping();
                    return;
                }

                if (typewriterState.currentIndex < text.length) {
                    const currentContent = text.substring(0, typewriterState.currentIndex + 1);
                    textElement.innerHTML = processTextForDisplay(currentContent);
                    textElement.appendChild(cursorElement);

                    typewriterState.currentIndex++;
                    scrollToBottom();

                    const speed = typewriterState.skipRequested ?
                        CONFIG.typewriterSpeedFast : CONFIG.typewriterSpeed;

                    typewriterState.timeoutId = setTimeout(typeNextChar, speed);
                } else {
                    finishTyping();
                }
            }

            function finishTyping() {
                typewriterState.isTyping = false;
                if (cursorElement.parentNode) {
                    cursorElement.remove();
                }
                DOM.tapIndicator.classList.remove('visible');
                scrollToBottom();
                resolve();
            }

            typeNextChar();
        });
    }

    async function typewriterLogo(logoText) {
        return new Promise((resolve) => {
            typewriterState.isTyping = true;
            typewriterState.skipRequested = false;

            const logoElement = document.createElement('pre');
            logoElement.className = 'logo';
            DOM.textOutput.appendChild(logoElement);

            const lines = logoText.split('\n');
            let lineIndex = 0;

            function typeNextLine() {
                if (typewriterState.skipRequested || lineIndex >= lines.length) {
                    // Complete immediately
                    logoElement.textContent = logoText;
                    typewriterState.isTyping = false;
                    scrollToBottom();
                    resolve();
                    return;
                }

                logoElement.textContent = lines.slice(0, lineIndex + 1).join('\n');
                lineIndex++;
                scrollToBottom();

                typewriterState.timeoutId = setTimeout(typeNextLine, 50);
            }

            typeNextLine();
        });
    }

    function processTextForDisplay(text) {
        // Convert special formatting
        return text
            .replace(/\n/g, '<br>')
            .replace(/\[([A-Z\s']+)\]:/g, '<span class="speaker">[$1]:</span>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }

    function skipTypewriter() {
        if (typewriterState.isTyping) {
            typewriterState.skipRequested = true;
            if (typewriterState.timeoutId) {
                clearTimeout(typewriterState.timeoutId);
                typewriterState.timeoutId = null;
            }
        }
    }

    // ==================== UI UPDATES ====================
    function updateHeader() {
        DOM.header.day.textContent = `DAY ${gameState.day}`;
        DOM.header.episode.textContent = `EPISODE ${gameState.episode}`;

        const playerCount = gameState.active_players ? gameState.active_players.length : 8;
        DOM.header.players.textContent = `${playerCount} PLAYER${playerCount !== 1 ? 'S' : ''}`;
    }

    function clearTextOutput() {
        DOM.textOutput.innerHTML = '';
    }

    function appendText(text, className = '') {
        const element = document.createElement('span');
        element.className = className;
        element.innerHTML = processTextForDisplay(text);

        // If there's an existing text block, append to it
        const lastBlock = DOM.textOutput.lastElementChild;
        if (lastBlock && lastBlock.classList.contains('text-block')) {
            lastBlock.appendChild(element);
        } else {
            const block = document.createElement('div');
            block.className = 'text-block';
            block.appendChild(element);
            DOM.textOutput.appendChild(block);
        }
        scrollToBottom();
    }

    function appendDivider() {
        const hr = document.createElement('hr');
        hr.className = 'divider';
        DOM.textOutput.appendChild(hr);
        scrollToBottom();
    }

    function scrollToBottom() {
        DOM.textOutput.scrollTop = DOM.textOutput.scrollHeight;
    }

    function showChoices(choices) {
        DOM.choicesContainer.innerHTML = '';

        choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';

            if (choice.number !== undefined) {
                btn.innerHTML = `<span class="choice-number">[${choice.number}]</span> ${choice.text}`;
            } else {
                btn.textContent = choice.text;
            }

            btn.addEventListener('click', () => {
                choice.action();
            });

            DOM.choicesContainer.appendChild(btn);
        });

        DOM.choicesContainer.classList.add('visible');
        scrollToBottom();
    }

    function hideChoices() {
        DOM.choicesContainer.classList.remove('visible');
        DOM.choicesContainer.innerHTML = '';
    }

    function showContinuePromptUI() {
        DOM.continuePrompt.classList.remove('hidden');
    }

    function hideContinuePromptUI() {
        DOM.continuePrompt.classList.add('hidden');
    }

    function showError(message) {
        clearTextOutput();
        appendText('ERROR: ' + message, 'text-error');
    }

    // ==================== EVENT HANDLERS ====================
    function handleScreenTap(e) {
        // Don't interfere with button clicks
        if (e.target.tagName === 'BUTTON') return;

        if (typewriterState.isTyping) {
            skipTypewriter();
        } else if (uiState.isWaitingForContinue && typewriterState.onComplete) {
            typewriterState.onComplete();
            typewriterState.onComplete = null;
        }
    }

    function handleKeyPress(e) {
        // Number keys for choices
        if (e.key >= '1' && e.key <= '9') {
            const choiceBtns = DOM.choicesContainer.querySelectorAll('.choice-btn');
            const index = parseInt(e.key) - 1;
            if (choiceBtns[index]) {
                choiceBtns[index].click();
            }
        }

        // Space or Enter to continue/skip
        if (e.key === ' ' || e.key === 'Enter') {
            if (!isAnyOverlayVisible()) {
                e.preventDefault();
                handleScreenTap(e);
            }
        }

        // Escape for menu
        if (e.key === 'Escape') {
            if (isAnyOverlayVisible()) {
                hideAllOverlays();
            } else {
                showMenu();
            }
        }
    }

    // ==================== OVERLAYS ====================
    function showMenu() {
        DOM.overlays.menu.classList.remove('hidden');
    }

    function hideMenu() {
        DOM.overlays.menu.classList.add('hidden');
    }

    function showStatus() {
        hideMenu();
        renderStatusPanel();
        DOM.overlays.status.classList.remove('hidden');
    }

    function hideStatus() {
        DOM.overlays.status.classList.add('hidden');
    }

    function showNameInput() {
        DOM.playerNameInput.value = '';
        DOM.overlays.name.classList.remove('hidden');
        setTimeout(() => DOM.playerNameInput.focus(), 100);
    }

    function hideNameInput() {
        DOM.overlays.name.classList.add('hidden');
    }

    function submitPlayerName() {
        const name = DOM.playerNameInput.value.trim().toUpperCase();
        if (name.length > 0) {
            gameState.player_name = name;
            hideNameInput();

            // Clear screen and start the game
            clearTextOutput();
            processNode(gameState.current_node);
        }
    }

    function showSaveLoad(isSave) {
        hideMenu();
        uiState.isSaveMode = isSave;
        DOM.saveTitle.textContent = isSave ? 'SAVE GAME' : 'LOAD GAME';
        renderSaveSlots();
        DOM.overlays.save.classList.remove('hidden');
    }

    function hideSaveLoad() {
        DOM.overlays.save.classList.add('hidden');
    }

    function hideAllOverlays() {
        DOM.overlays.menu.classList.add('hidden');
        DOM.overlays.status.classList.add('hidden');
        DOM.overlays.name.classList.add('hidden');
        DOM.overlays.save.classList.add('hidden');
    }

    function isAnyOverlayVisible() {
        return !DOM.overlays.menu.classList.contains('hidden') ||
               !DOM.overlays.status.classList.contains('hidden') ||
               !DOM.overlays.name.classList.contains('hidden') ||
               !DOM.overlays.save.classList.contains('hidden');
    }

    // ==================== STATUS PANEL ====================
    function renderStatusPanel() {
        let html = '';

        // Player info
        html += `<div class="status-section">
            <h3>PLAYER</h3>
            <div>${gameState.player_name}</div>
            <div>Challenge Wins: ${gameState.challenge_wins}</div>
            <div>Elimination Wins: ${gameState.elimination_wins}</div>
        </div>`;

        // Relationships
        html += `<div class="status-section">
            <h3>RELATIONSHIPS</h3>`;

        for (const [character, value] of Object.entries(gameState.relationships)) {
            // Skip eliminated players
            if (gameState.eliminated_players &&
                gameState.eliminated_players.includes(character)) {
                continue;
            }

            const status = getRelationshipStatus(value);
            const fillWidth = Math.abs(value) / 2;
            const fillLeft = value >= 0 ? 50 : 50 - fillWidth;
            const fillColor = value >= 0 ? '#33ff33' : '#ff3333';

            html += `<div class="relationship-bar">
                <span class="relationship-name">${capitalize(character)}</span>
                <div class="relationship-meter">
                    <div class="relationship-fill" style="left: ${fillLeft}%; width: ${fillWidth}%; background: ${fillColor}"></div>
                </div>
                <span class="relationship-value">${value > 0 ? '+' : ''}${value}</span>
            </div>`;
        }
        html += '</div>';

        // Alliances
        if (gameState.alliances && gameState.alliances.length > 0) {
            html += `<div class="status-section">
                <h3>ALLIANCES</h3>`;
            gameState.alliances.forEach(alliance => {
                html += `<div>- ${formatAllianceName(alliance)}</div>`;
            });
            html += '</div>';
        }

        // Eliminated
        if (gameState.eliminated_players && gameState.eliminated_players.length > 0) {
            html += `<div class="status-section">
                <h3>ELIMINATED</h3>`;
            gameState.eliminated_players.forEach(player => {
                html += `<div class="text-dim">- ${capitalize(player)}</div>`;
            });
            html += '</div>';
        }

        DOM.statusContent.innerHTML = html;
    }

    function getRelationshipStatus(value) {
        if (value >= 50) return 'Ally';
        if (value >= 25) return 'Friend';
        if (value >= -24) return 'Neutral';
        if (value >= -49) return 'Rival';
        return 'Enemy';
    }

    function formatAllianceName(alliance) {
        return alliance
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => capitalize(word))
            .join(' ');
    }

    // ==================== SAVE/LOAD SYSTEM ====================
    function renderSaveSlots() {
        DOM.saveSlots.innerHTML = '';

        for (let i = 1; i <= CONFIG.saveSlotCount; i++) {
            const saveData = loadFromStorage(CONFIG.localStorageKey + i);
            const btn = document.createElement('button');
            btn.className = 'save-slot' + (saveData ? ' has-save' : '');

            if (saveData) {
                btn.innerHTML = `
                    <span class="slot-name">SLOT ${i}</span><br>
                    <span class="slot-info">
                        ${saveData.player_name} - Day ${saveData.day}, Ep ${saveData.episode}<br>
                        ${new Date(saveData.timestamp).toLocaleDateString()}
                    </span>
                `;
            } else {
                btn.innerHTML = `<span class="slot-name">SLOT ${i}</span><br><span class="slot-info">Empty</span>`;
            }

            btn.addEventListener('click', () => {
                if (uiState.isSaveMode) {
                    saveToSlot(i);
                } else if (saveData) {
                    loadFromSlot(i);
                }
            });

            DOM.saveSlots.appendChild(btn);
        }
    }

    function saveToSlot(slot) {
        const saveData = {
            ...gameState,
            timestamp: Date.now()
        };
        saveToStorage(CONFIG.localStorageKey + slot, saveData);
        hideSaveLoad();

        // Flash confirmation
        DOM.gameContainer.classList.add('screen-flicker');
        setTimeout(() => DOM.gameContainer.classList.remove('screen-flicker'), 300);
    }

    function loadFromSlot(slot) {
        const saveData = loadFromStorage(CONFIG.localStorageKey + slot);
        if (saveData) {
            loadGameState(saveData);
        }
    }

    function loadGameState(saveData) {
        gameState = { ...saveData };
        delete gameState.timestamp;

        hideSaveLoad();
        hideAllOverlays();
        clearTextOutput();
        updateHeader();
        processNode(gameState.current_node);
    }

    function autoSave() {
        const saveData = {
            ...gameState,
            timestamp: Date.now()
        };
        saveToStorage(CONFIG.autoSaveKey, saveData);
    }

    function saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save:', e);
        }
    }

    function loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to load:', e);
            return null;
        }
    }

    function clearFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Failed to clear:', e);
        }
    }

    function confirmRestart() {
        if (confirm('Are you sure you want to restart? Progress will be lost.')) {
            clearFromStorage(CONFIG.autoSaveKey);
            hideAllOverlays();
            startNewGame();
        }
    }

    // ==================== UTILITY FUNCTIONS ====================
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ==================== START THE GAME ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
