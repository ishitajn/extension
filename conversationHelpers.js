import nlp from './lib/compromise.js';
const DEBUG = {
    log: (category, message, data = null) => console.log(`[WINGMAN-HELPER-${category.toUpperCase()}] ${message}`, data ?? ''),
};
export const LINGUISTIC_STYLES = ['auto', 'casual', 'charming', 'direct', 'intellectual', 'mysterious', 'playful', 'poetic', 'sarcastic', 'sexual', 'witty'].sort((a, b) => a === 'auto' ? -1 : b === 'auto' ? 1 : a.localeCompare(b));
export const DATE_ARC_PHASES = ['rapport', 'escalation', 'planning'];

// ===================================================================================
// SECTION 1: CORE STATE & SUBTEXT ANALYSIS
// ===================================================================================

/**
 * Analyzes the subtext of a single message for emotion, intent, and nuance.
 * @param {object} doc - A compromise.js document object.
 * @returns {Omit<LastMessageAnalysis, 'isDirectQuestion' | 'isLowEffort' | 'isGeoRelated' | 'suggestedResponseStyle' | 'questionInfo'>} A structured object containing detailed subtext analysis.
 */
function analyzeMessageSubtext(doc) {
    const subtext = {
        valence: 0.0,
        arousal: 0.0,
        intents: new Set(),
        isSarcastic: false,
        isAmbiguous: false,
        isVulnerable: false,
    };

    const positiveWords = {
        'absolutely': 0.7,
        'amazing': 0.9,
        'awesome': 0.8,
        'beautiful': 0.85,
        'brilliant': 0.8,
        'cool': 0.4,
        'cute': 0.6,
        'definitely': 0.7,
        'dope': 0.6,
        'excellent': 0.8,
        'excited': 0.7,
        'fantastic': 0.8,
        'fun': 0.6,
        'gorgeous': 0.9,
        'great': 0.7,
        'happy': 0.7,
        'hilarious': 0.7,
        'incredible': 0.9,
        'interesting': 0.5,
        'love': 0.9,
        'lovely': 0.7,
        'nice': 0.5,
        'perfect': 0.95,
        'sweet': 0.6,
        'totally': 0.6,
        'wonderful': 0.8,
        'acceptable': 0.2,
        'adequate': 0.1,
        'agreeable': 0.4,
        'alright': 0.3,
        'appealing': 0.5,
        'appreciated': 0.5,
        'approved': 0.4,
        'charming': 0.5,
        'comfy': 0.4,
        'decent': 0.4,
        'enjoyable': 0.5,
        'favorable': 0.4,
        'fine': 0.3,
        'good': 0.5,
        'helpful': 0.5,
        'okay': 0.2,
        'pleasant': 0.5,
        'pleasing': 0.5,
        'satisfactory': 0.3,
        'solid': 0.5,
        'sound': 0.4,
        'sufficient': 0.2,
        'sweet': 0.6,
        'welcome': 0.5,
        'accomplished': 0.8,
        'admirable': 0.7,
        'adorable': 0.7,
        'astounding': 0.8,
        'breathtaking': 0.8,
        'captivating': 0.7,
        'classic': 0.7,
        'compelling': 0.7,
        'dazzling': 0.8,
        'delightful': 0.7,
        'divine': 0.8,
        'dynamic': 0.7,
        'effective': 0.6,
        'efficient': 0.6,
        'elegant': 0.7,
        'enchanting': 0.8,
        'engaging': 0.7,
        'exceptional': 0.8,
        'fabulous': 0.8,
        'fantastic': 0.8,
        'impressive': 0.8,
        'legendary': 0.8,
        'marvelous': 0.8,
        'masterful': 0.8,
        'outstanding': 0.8,
        'polished': 0.7,
        'powerful': 0.7,
        'premium': 0.7,
        'primo': 0.8,
        'quality': 0.7,
        'rad': 0.6,
        'remarkable': 0.8,
        'rocking': 0.7,
        'sensational': 0.8,
        'sick': 0.7,
        'spectacular': 0.8,
        'splendid': 0.7,
        'stellar': 0.8,
        'striking': 0.7,
        'stunning': 0.8,
        'stylish': 0.6,
        'super': 0.6,
        'superb': 0.8,
        'superior': 0.7,
        'terrific': 0.8,
        'thrilling': 0.7,
        'top-notch': 0.8,
        'tremendous': 0.7,
        'valuable': 0.6,
        'vibrant': 0.7,
        'virtuous': 0.8,
        'wow': 0.7,
        'A+': 1.0,
        'ace': 0.9,
        'astonishing': 0.9,
        'best': 1.0,
        'champion': 0.9,
        'chief': 0.9,
        'consummate': 0.9,
        'elite': 0.9,
        'epic': 0.9,
        'exemplary': 0.9,
        'exquisite': 0.9,
        'extraordinary': 0.9,
        'flawless': 1.0,
        'foremost': 0.9,
        'god-tier': 1.0,
        'greatest': 1.0,
        'heavenly': 0.9,
        'ideal': 0.9,
        'immaculate': 1.0,
        'impeccable': 1.0,
        'incomparable': 0.9,
        'magnificent': 0.9,
        'majestic': 0.9,
        'masterpiece': 1.0,
        'matchless': 0.9,
        'mind-blowing': 0.9,
        'miraculous': 0.9,
        'monumental': 0.9,
        'optimal': 0.9,
        'peerless': 0.9,
        'phenomenal': 0.9,
        'pinnacle': 1.0,
        'pristine': 0.9,
        'quintessential': 0.9,
        'second-to-none': 1.0,
        'sublime': 0.9,
        'supreme': 1.0,
        'transcendent': 0.9,
        'ultimate': 1.0,
        'unbeatable': 1.0,
        'unbelievable': 0.9,
        'unequaled': 0.9,
        'unmatched': 0.9,
        'unparalleled': 0.9,
        'unrivaled': 0.9,
        'unsurpassed': 0.9,
        'utopia': 1.0,
        'world-class': 0.9,
        'zenith': 1.0,
        '100%': 0.8,
        'accurate': 0.6,
        'agreed': 0.6,
        'amen': 0.7,
        'approved': 0.5,
        'bet': 0.6,
        'certainly': 0.7,
        'correct': 0.6,
        'exactly': 0.7,
        'for sure': 0.6,
        'hell yeah': 0.8,
        'indeed': 0.6,
        'of course': 0.6,
        'precisely': 0.7,
        'right': 0.5,
        'true': 0.5,
        'truth': 0.6,
        'undoubtedly': 0.7,
        'unquestionably': 0.8,
        'valid': 0.6,
        'very well': 0.5,
        'yep': 0.4,
        'yes': 0.5,
        'yessir': 0.6,
        'amused': 0.6,
        'blessed': 0.8,
        'blissful': 0.9,
        'celebratory': 0.7,
        'cheerful': 0.6,
        'content': 0.5,
        'ecstatic': 0.9,
        'elated': 0.9,
        'euphoric': 1.0,
        'exhilarated': 0.9,
        'gleeful': 0.7,
        'grateful': 0.7,
        'heartwarming': 0.8,
        'hopeful': 0.6,
        'inspired': 0.7,
        'jolly': 0.6,
        'joy': 0.8,
        'joyful': 0.8,
        'joyous': 0.8,
        'jubilant': 0.9,
        'laughing': 0.7,
        'merry': 0.6,
        'optimistic': 0.6,
        'overjoyed': 0.9,
        'paradise': 1.0,
        'proud': 0.7,
        'pumped': 0.8,
        'rapturous': 0.9,
        'rejoicing': 0.8,
        'relieved': 0.6,
        'satisfied': 0.5,
        'stoked': 0.8,
        'thankful': 0.7,
        'thrilled': 0.8,
        'triumphant': 0.9,
        'upbeat': 0.6,
        'victorious': 0.9,
        'banger': 0.8,
        'based': 0.7,
        'bet': 0.5,
        'bussin': 0.8,
        'chad': 0.8,
        'cheers': 0.5,
        'clutch': 0.8,
        'fire': 0.9,
        'flex': 0.6,
        'fresh': 0.6,
        'G.O.A.T.': 1.0,
        'goat': 1.0,
        'king': 0.9,
        'lit': 0.8,
        'pog': 0.7,
        'poggers': 0.7,
        'queen': 0.9,
        'slaps': 0.8,
        'slay': 0.8,
        'snatched': 0.7,
        'sweet': 0.6,
        'valid': 0.6,
        'vibe': 0.5,
        'adore': 0.9,
        'angel': 0.9,
        'beloved': 0.9,
        'cherish': 0.8,
        'darling': 0.8,
        'dear': 0.7,
        'gem': 0.8,
        'hero': 0.9,
        'honey': 0.7,
        'precious': 0.8,
        'sweetheart': 0.8,
        'treasure': 0.9,
    };
    const negativeWords = {
        'annoying': -0.6,
        'awful': -0.9,
        'bad': -0.6,
        'boring': -0.7,
        'bummer': -0.5,
        'disappointing': -0.6,
        'dislike': -0.8,
        'frustrating': -0.7,
        'hate': -0.9,
        'horrible': -0.9,
        'lame': -0.5,
        'meh': -0.4,
        'rough': -0.5,
        'sad': -0.7,
        'sucks': -0.8,
        'terrible': -0.8,
        'ugh': -0.4,
        'unfortunate': -0.5,
        'worst': -1.0,
        'awkward': -0.4,
        'bland': -0.5,
        'cheap': -0.4,
        'clumsy': -0.3,
        'confusing': -0.4,
        'corny': -0.4,
        'creepy': -0.5,
        'dated': -0.4,
        'dull': -0.5,
        'faulty': -0.5,
        'flawed': -0.4,
        'icky': -0.5,
        'imperfect': -0.3,
        'inconvenient': -0.4,
        'inferior': -0.5,
        'lacking': -0.4,
        'mediocre': -0.5,
        'messy': -0.4,
        'misguided': -0.5,
        'mundane': -0.5,
        'nope': -0.3,
        'not good': -0.5,
        'odd': -0.3,
        'old': -0.3,
        'overrated': -0.5,
        'pain': -0.5,
        'poor': -0.5,
        'questionable': -0.4,
        'stale': -0.5,
        'strange': -0.4,
        'subpar': -0.5,
        'tacky': -0.5,
        'tired': -0.4,
        'trivial': -0.3,
        'uninspired': -0.5,
        'unpleasant': -0.5,
        'weak': -0.4,
        'weird': -0.4,
        'abysmal': -0.8,
        'aggravating': -0.7,
        'alarming': -0.6,
        'angry': -0.7,
        'atrocious': -0.8,
        'brutal': -0.7,
        'callous': -0.8,
        'careless': -0.6,
        'chaotic': -0.7,
        'cold': -0.6,
        'corrupt': -0.8,
        'cowardly': -0.7,
        'criminal': -0.8,
        'cruel': -0.8,
        'damaging': -0.7,
        'dangerous': -0.8,
        'deceitful': -0.8,
        'defective': -0.7,
        'deplorable': -0.8,
        'disaster': -0.8,
        'disastrous': -0.8,
        'disgraceful': -0.8,
        'dishonest': -0.7,
        'dismal': -0.7,
        'distressing': -0.7,
        'disturbing': -0.8,
        'dreadful': -0.8,
        'embarrassing': -0.7,
        'enraging': -0.8,
        'evil': -0.8,
        'foul': -0.8,
        'garbage': -0.8,
        'ghastly': -0.8,
        'grim': -0.7,
        'gross': -0.7,
        'gruesome': -0.8,
        'harmful': -0.7,
        'harsh': -0.6,
        'hateful': -0.8,
        'hideous': -0.8,
        'hostile': -0.7,
        'idiotic': -0.8,
        'ignorant': -0.7,
        'immoral': -0.8,
        'infuriating': -0.8,
        'insufferable': -0.8,
        'insulting': -0.7,
        'intolerable': -0.8,
        'irritating': -0.6,
        'jealous': -0.6,
        'junky': -0.7,
        'laughable': -0.6,
        'malicious': -0.8,
        'monstrous': -0.8,
        'nasty': -0.7,
        'nauseating': -0.8,
        'negative': -0.6,
        'obnoxious': -0.7,
        'offensive': -0.8,
        'outrageous': -0.7,
        'pathetic': -0.8,
        'pissed': -0.8,
        'poisonous': -0.8,
        'predatory': -0.8,
        'problematic': -0.6,
        'repugnant': -0.8,
        'repulsive': -0.8,
        'revolting': -0.8,
        'rotten': -0.7,
        'rude': -0.6,
        'scary': -0.7,
        'severe': -0.6,
        'shameful': -0.7,
        'shocking': -0.6,
        'shoddy': -0.7,
        'sinister': -0.8,
        'stressful': -0.6,
        'stupid': -0.8,
        'toxic': -0.8,
        'tragic': -0.8,
        'trashy': -0.7,
        'unacceptable': -0.8,
        'unbearable': -0.8,
        'unethical': -0.8,
        'unfair': -0.7,
        'unforgivable': -0.8,
        'unprofessional': -0.7,
        'unstable': -0.7,
        'unwatchable': -0.8,
        'useless': -0.8,
        'vile': -0.8,
        'violent': -0.8,
        'worthless': -0.8,
        'wretched': -0.8,
        'abhorrent': -1.0,
        'abomination': -1.0,
        'amoral': -0.9,
        'barbaric': -0.9,
        'cancerous': -1.0,
        'condemned': -0.9,
        'contemptible': -0.9,
        'corrosive': -0.9,
        'damned': -0.9,
        'degenerate': -1.0,
        'demonic': -1.0,
        'despicable': -1.0,
        'detestable': -1.0,
        'disgusting': -1.0,
        'execrable': -1.0,
        'heinous': -1.0,
        'hellish': -1.0,
        'irredeemable': -1.0,
        'loathsome': -1.0,
        'malevolent': -0.9,
        'nefarious': -0.9,
        'nightmare': -0.9,
        'nightmarish': -0.9,
        'obscene': -0.9,
        'pernicious': -0.9,
        'perverted': -0.9,
        'putrid': -1.0,
        'rancid': -0.9,
        'sadistic': -1.0,
        'scum': -1.0,
        'soulless': -0.9,
        'unforgivable': -1.0,
        'unspeakable': -0.9,
        'vicious': -0.9,
        'villainous': -0.9,
        'abandoned': -0.8,
        'anguish': -0.9,
        'anxious': -0.6,
        'apathetic': -0.7,
        'bleak': -0.8,
        'broken': -0.8,
        'crushed': -0.9,
        'defeated': -0.7,
        'dejected': -0.8,
        'depressed': -0.9,
        'depressing': -0.9,
        'desolate': -0.8,
        'despair': -0.9,
        'desperate': -0.8,
        'devastated': -0.9,
        'drained': -0.7,
        'empty': -0.8,
        'grief': -0.9,
        'heartbreak': -0.9,
        'heartbroken': -0.9,
        'helpless': -0.8,
        'hopeless': -0.9,
        'hurting': -0.7,
        'lonely': -0.8,
        'lost': -0.7,
        'miserable': -0.9,
        'misery': -0.9,
        'mourning': -0.8,
        'numb': -0.7,
        'overwhelmed': -0.7,
        'powerless': -0.8,
        'regret': -0.7,
        'rejected': -0.8,
        'somber': -0.7,
        'sorrow': -0.8,
        'suffering': -0.9,
        'suicidal': -1.0,
        'tears': -0.7,
        'torment': -0.9,
        'torture': -0.9,
        'troubled': -0.6,
        'unhappy': -0.7,
        'weeping': -0.8,
        'woe': -0.8,
        'amateur': -0.6,
        'bankrupt': -0.8,
        'botched': -0.7,
        'broken': -0.6,
        'catastrophe': -0.9,
        'debacle': -0.8,
        'defunct': -0.6,
        'error': -0.5,
        'fail': -0.8,
        'failure': -0.8,
        'fiasco': -0.8,
        'foolish': -0.6,
        'futile': -0.7,
        'illogical': -0.6,
        'incompetent': -0.8,
        'ineffective': -0.7,
        'inept': -0.8,
        'ruined': -0.8,
        'shambles': -0.7,
        'unskilled': -0.6,
        'unsuccessful': -0.7,
        'useless': -0.9,
        'vain': -0.6,
        'wrong': -0.5,
        'basic': -0.5,
        'bruh': -0.4,
        'cancelled': -0.7,
        'cringe': -0.7,
        'cringey': -0.7,
        'facepalm': -0.5,
        'fail': -0.8,
        'flop': -0.7,
        'gross': -0.7,
        'ick': -0.6,
        'oof': -0.5,
        'problematic': -0.6,
        'simp': -0.6,
        'sus': -0.5,
        'trash': -0.8,
        'tryhard': -0.5,
        'yikes': -0.6,
        'arse': -0.7,
        'arsehole': -0.9,
        'ass': -0.7,
        'ass-hat': -0.9,
        'asshole': -1.0,
        'bastard': -0.9,
        'bitch': -1.0,
        'bitchy': -0.8,
        'bollocks': -0.7,
        'bullshit': -0.8,
        'clown': -0.8,
        'cock': -0.8,
        'cocksucker': -1.0,
        'crap': -0.6,
        'crappy': -0.7,
        'cunt': -1.0,
        'damn': -0.6,
        'dammit': -0.6,
        'dick': -0.9,
        'dickhead': -1.0,
        'douche': -0.9,
        'douchebag': -1.0,
        'dumbass': -0.9,
        'fag': -1.0,
        'faggot': -1.0,
        'fuck': -0.9,
        'fucked': -1.0,
        'fucker': -1.0,
        'fucking': -0.9,
        'fuckwit': -1.0,
        'goddamn': -0.7,
        'hell': -0.6,
        'incel': -0.9,
        'jackass': -0.9,
        'jerk': -0.8,
        'motherfucker': -1.0,
        'piss': -0.7,
        'pissed': -0.8,
        'prick': -0.9,
        'retard': -1.0,
        'retarded': -1.0,
        'scumbag': -1.0,
        'shit': -0.8,
        'shit-tier': -0.9,
        'shite': -0.8,
        'shithole': -1.0,
        'shitty': -0.9,
        'slut': -0.9,
        'son of a bitch': -1.0,
        'twat': -0.9,
        'wanker': -0.9,
        'whore': -0.9,
    };
    const arousalWords = {
        '!': 0.3,
        '!!': 0.6,
        '!!!': 0.8,
        'boring': -0.7,
        'crazy': 0.7,
        'exhausted': -0.6,
        'haha': 0.2,
        'hahaha': 0.4,
        'insane': 0.8,
        'lmao': 0.5,
        'lol': 0.3,
        'no way': 0.7,
        'omg': 0.7,
        'omfg': 0.9,
        'rofl': 0.6,
        'sleepy': -0.4,
        'tired': -0.6,
        'what': 0.5,
        'wow': 0.6,
        'wtf': 0.8,
        'AAAH': 0.9,
        'ABSOLUTELY': 0.8,
        'ALARM': 0.7,
        'ALIVE': 0.6,
        'AMAZING': 0.8,
        'ANGRY': 0.7,
        'ANXIOUS': 0.6,
        'ARE YOU KIDDING ME': 0.8,
        'ARE YOU SERIOUS': 0.8,
        'ATTACK': 0.7,
        'BOOM': 0.7,
        'CRAZY': 0.8,
        'CRISIS': 0.8,
        'DANGER': 0.8,
        'ECSTATIC': 0.9,
        'EMERGENCY': 0.9,
        'ENRAGED': 0.9,
        'EPIC': 0.8,
        'EUPHORIC': 0.9,
        'EXCITED': 0.7,
        'EXPLOSION': 0.9,
        'FAST': 0.6,
        'FEAR': 0.7,
        'FIGHT': 0.7,
        'FUCK': 0.9,
        'FUCK YEAH': 1.0,
        'FURIOUS': 0.9,
        'GET OUT': 0.7,
        'GO': 0.6,
        'HELP': 0.8,
        'HOLY SHIT': 0.9,
        'HURRY': 0.7,
        'HYPE': 0.8,
        'HYPED': 0.8,
        'INCREDIBLE': 0.8,
        'INSANE': 0.9,
        'INTENSE': 0.7,
        'JESUS CHRIST': 0.8,
        'LET\'S GO': 0.8,
        'MAD': 0.7,
        'MIND-BLOWING': 0.9,
        'NO FUCKING WAY': 1.0,
        'NO WAY': 0.7,
        'NOW': 0.6,
        'OMFG': 0.9,
        'OMG': 0.7,
        'PANIC': 0.8,
        'PUMPED': 0.8,
        'QUICK': 0.6,
        'RAGE': 0.9,
        'RIOT': 0.8,
        'RUN': 0.7,
        'SCREAM': 0.8,
        'SHIT': 0.7,
        'SHOCK': 0.7,
        'SHOCKED': 0.7,
        'STOP': 0.6,
        'STOKED': 0.8,
        'SURPRISE': 0.6,
        'TERRIFIED': 0.9,
        'THRILL': 0.7,
        'UNBELIEVABLE': 0.8,
        'URGENT': 0.8,
        'VIOLENCE': 0.8,
        'WAIT': 0.5,
        'WATCH OUT': 0.8,
        'WHAT THE FUCK': 1.0,
        'WHAT?!': 0.8,
        'WHOA': 0.6,
        'WILD': 0.7,
        'WTF': 0.9,
        'YELL': 0.7,
        'YES!': 0.7,
        'apathetic': -0.8,
        'asleep': -1.0,
        'blah': -0.7,
        'bored': -0.7,
        'calm': -0.5,
        'chill': -0.4,
        'dead': -0.9,
        'depleted': -0.7,
        'drained': -0.8,
        'drowsy': -0.6,
        'dull': -0.6,
        'exhausted': -0.8,
        'fatigued': -0.7,
        'flat': -0.6,
        'indifferent': -0.8,
        'lazy': -0.6,
        'lethargic': -0.9,
        'lifeless': -0.9,
        'low': -0.5,
        'meh': -0.6,
        'mild': -0.4,
        'numb': -0.8,
        'passive': -0.6,
        'peaceful': -0.7,
        'quiet': -0.5,
        'relaxed': -0.6,
        'serene': -0.8,
        'slow': -0.5,
        'sluggish': -0.7,
        'still': -0.6,
        'subtle': -0.4,
        'tranquil': -0.8,
        'uninterested': -0.7,
        'weary': -0.7,
        'whatever': -0.7,
        'zonked': -0.8,
        'aha': 0.3,
        'bahaha': 0.5,
        'giggle': 0.3,
        'haha': 0.2,
        'hahaha': 0.4,
        'hehe': 0.2,
        'hilarious': 0.6,
        'I\'m dead': 0.6,
        'I\'m dying': 0.6,
        'kek': 0.4,
        'lmfao': 0.7,
        'lmao': 0.5,
        'lol': 0.3,
        'lolz': 0.3,
        'pmsl': 0.7,
        'rofl': 0.6,
        'roflmao': 0.7,
        '?': 0.2,
        '?!': 0.6,
        '??': 0.4,
        '???': 0.6,
        '...': -0.2,
        'hmm': -0.1,
        'huh': 0.3,
        'oh': 0.2,
        'uh': -0.1,
        'um': -0.1,
        'well': -0.1,
    };
    const vulnerableWords = ['a little scared', 'actually', 'confess', 'feeling a bit down', 'honestly', 'i admit', 'i feel', 'i struggle with', 'i\'ve never told anyone', 'i\'m worried', 'if that makes sense', 'is that weird', 'it\'s been tough', 'my secret is', 'nervous', 'opening up', 'tbh', 'to be honest', 'I have a confession', 'I must admit', 'I have to confess', 'my biggest fear is', 'my weakness is', 'the truth is', 'can I tell you a secret?', 'full disclosure', 'I shouldn\'t say this but', 'I messed up', 'it was my fault', 'I regret', 'I was wrong', 'I apologize for', 'for what it\'s worth', 'I feel like', 'it makes me feel', 'deep down', 'on the inside', 'I\'m feeling', 'my heart sank', 'I\'m hurting', 'I feel so alone', 'I\'m lost', 'I\'m not okay', 'I feel empty', 'it hurts', 'this is hard for me to say', 'I\'m going through a lot', 'I\'m at my limit', 'I can\'t handle this', 'am I crazy for', 'call me crazy but', 'does that make any sense?', 'don\'t judge me but', 'is it just me or', 'I don\'t know', 'I guess', 'I might be wrong but', 'maybe I\'m overthinking this', 'or something', 'tell me what you think', 'what should I do?', 'you probably think I\'m', 'I need your advice', 'am I being unreasonable?', 'is this normal?', 'I feel insecure about', 'I\'m not good enough', 'I\'m trying my best', 'I\'m scared of', 'I\'m afraid', 'I feel like a failure', 'I\'m struggling with', 'my anxiety is', 'I\'m so anxious', 'I\'m overwhelmed', 'I don\'t know how to', 'I\'m not sure if', 'I doubt', 'I worry that', 'for real', 'genuinely', 'in all honesty', 'in all seriousness', 'let me be real', 'let\'s be real', 'look,', 'not gonna lie', 'NGL', 'real talk', 'sincerely', 'to tell you the truth'];
    const sexualWords = ['bed', 'beautiful', 'body', 'come over', 'craving', 'cuddle', 'cute', 'desire', 'dirty', 'get a room', 'gorgeous', 'handsome', 'hot', 'kiss', 'lips', 'make a move', 'my place', 'naughty', 'pleasure', 'sexy', 'sheets', 'skin', 'spoil', 'stunning', 'taste', 'tease', 'tonight', 'touch', 'undress', 'your place', 'adore', 'all night', 'caress', 'cherish', 'close', 'embrace', 'erotic', 'explore', 'foreplay', 'hold me', 'intimacy', 'intimate', 'lover', 'making love', 'massage', 'naked', 'passion', 'passionate', 'ravish', 'romance', 'seduce', 'seductive', 'sensual', 'share a bed', 'slowly', 'soft', 'sweet', 'tender', 'warm', 'whisper', 'alone time', 'can\'t wait', 'can\'t stop thinking about you', 'come here', 'get you alone', 'I want you', 'in the mood', 'let\'s get into trouble', 'let\'s play', 'make you mine', 'mischief', 'need you', 'private', 'room for two', 'temptation', 'tempting', 'turn on', 'turned on', 'what are you wearing', 'wild', 'you drive me crazy', 'you turn me on', 'abs', 'anus', 'areola', 'ass', 'asshole', 'balls', 'bellend', 'body', 'boobies', 'boobs', 'breast', 'breasts', 'butt', 'butt-hole', 'cheeks', 'chest', 'clit', 'clitoris', 'cock', 'crotch', 'dick', 'erection', 'g-spot', 'genitals', 'glutes', 'groin', 'hole', 'member', 'mouth', 'nipple', 'nipples', 'nuts', 'package', 'pecker', 'penis', 'prostate', 'pussy', 'scrotum', 'shaft', 'taint', 'testicles', 'thighs', 'tits', 'titties', 'tongue', 'vagina', 'bang', 'beat', 'bend over', 'blow', 'blowjob', 'bone', 'bukkake', 'choke', 'come', 'creampie', 'cunnilingus', 'deepthroat', 'devour', 'doggy style', 'dominate', 'drill', 'eat', 'eat out', 'ejaculate', 'face-sit', 'facial', 'fellatio', 'finger', 'fingering', 'fist', 'fisting', 'fuck', 'fucking', 'gangbang', 'go down on', 'grind', 'handjob', 'have sex', 'head', 'hump', 'inside you', 'jack off', 'jerk off', 'jizz', 'lick', 'mount', 'nail', 'orgasm', 'pegging', 'penetrate', 'penetration', 'pound', 'pump', 'rail', 'rim', 'rimjob', 'ride', 'rub', 'satisfy', 'screw', 'shag', 'sixty-nine', 'smash', 'spitroast', 'spread', 'stroke', 'suck', 'suck off', 'submit', 'swallow', 'take it', 'thrust', 'top', 'toss off', 'wank', 'aroused', 'climax', 'come', 'creamy', 'cum', 'cumshot', 'dripping', 'erect', 'hard', 'horny', 'in heat', 'jizz', 'juices', 'lust', 'moist', 'orgasm', 'precum', 'randy', 'rock-hard', 'seed', 'semen', 'slutty', 'sperm', 'stiff', 'throbbing', 'wet', 'aftercare', 'age play', 'ball gag', 'bdsm', 'blindfold', 'bondage', 'brat', 'breath play', 'cane', 'chain', 'chastity', 'choke', 'collar', 'daddy', 'ddlg', 'discipline', 'dom', 'dominant', 'domme', 'dungeon', 'edge', 'edging', 'femboy', 'femdom', 'fetish', 'flog', 'gag', 'handcuffs', 'harness', 'humiliation', 'impact play', 'kink', 'kinky', 'leash', 'leather', 'latex', 'little', 'master', 'mistress', 'mommy', 'owner', 'paddle', 'pegging', 'pet', 'pet play', 'punish', 'punishment', 'rope', 'rough', 'safeword', 'sadism', 'serve', 'service', 'slave', 'spank', 'spanking', 'sub', 'submission', 'submissive', 'switch', 'tame', 'tie me up', 'use me', 'whip', 'anal beads', 'ball gag', 'ben wa balls', 'bondage tape', 'butt plug', 'cock ring', 'condom', 'dildo', 'fleshlight', 'gag', 'g-spot vibrator', 'handcuffs', 'hitachi', 'lingerie', 'lube', 'nipple clamps', 'paddles', 'restraints', 'riding crop', 'sex swing', 'sex toy', 'strapon', 'vibrator', 'whip', 'affair', 'all fours', 'backseat', 'bedroom', 'counter', 'hookup', 'hotel', 'motel', 'one night stand', 'orgy', 'porn', 'pornography', 'sex', 'sexual', 'shower', 'threesome'];
    const sexualEmojis = /😏|😈|🔥|💦|🥵|😜|😉|💋|👅|🍑|🍆|🛏️|🤤|😇|👀|💅|✨|🫦|👉|👌|👇|👆|💦|💨|♋️|69|💥|💫|✨|🌶️|🍭|🍦|🍩|🌮|🌭|🍌|🍒|🍾|🥂|⛓️|🔗|🪢|🪚|🔨|📍|📌| handcuffs | whip |🕯️|🔑|🔐|🍼| kitten | puppy | bull | top | bottom /;
    const text = doc.text('text');
    Object.entries(positiveWords).forEach(([word, score]) => {
        if (doc.has(word))
            subtext.valence += score;
    });
    Object.entries(negativeWords).forEach(([word, score]) => {
        if (doc.has(word))
            subtext.valence += score;
    });
    Object.entries(arousalWords).forEach(([word, score]) => {
        if (text.includes(word))
            subtext.arousal += score;
    });

    if (analyzeQuestion(doc).isQuestion)
        subtext.intents.add('questioning');
    if (detectLogisticsSignal(doc))
        subtext.intents.add('planning');
    if (doc.has('(haha|lol|lmao|rofl)'))
        subtext.intents.add('reacting_to_humor');
    if (doc.has('#PastTense') && doc.wordCount() > 15)
        subtext.intents.add('storytelling');
    if (doc.has(sexualWords.join('|')) || sexualEmojis.test(text))
        subtext.intents.add('flirting_or_sexual');
    if (subtext.intents.has('flirting_or_sexual')) {
        subtext.valence += 0.5;
        subtext.arousal += 0.7;
    }
    const sarcasticMarkers = ['(yeah right|sure|whatever|obviously)', '(so|totally|just) #Adverb? #PositiveAdjective'];
    if (doc.has(sarcasticMarkers.join('|')) && subtext.valence > 0)
        subtext.isSarcastic = true;

    const ambiguousPhrases = ['im down', 'sounds good', 'maybe', 'we should', 'sometime'];
    if (doc.has(ambiguousPhrases.join('|')) && !subtext.intents.has('planning'))
        subtext.isAmbiguous = true;

    if (doc.has(vulnerableWords.join('|')))
        subtext.isVulnerable = true;

    subtext.valence = Math.max(-1, Math.min(1, subtext.valence));
    subtext.arousal = Math.max(-1, Math.min(1, subtext.arousal));
    subtext.intents = Array.from(subtext.intents);

    return subtext;
}

/**
 * Analyzes only the last message from the match for immediate response context.
 * @param {Message[]} conversationHistory
 * @returns {LastMessageAnalysis} A structured subtext object or a default neutral object.
 */
function analyzeLastMessageForSubtext(conversationHistory) {
    const lastMessageFromMatch = conversationHistory?.filter(msg => msg.role === 'assistant').pop();
    if (!lastMessageFromMatch?.content) {
        return {
            valence: 0.0,
            arousal: 0.0,
            intents: [],
            isSarcastic: false,
            isAmbiguous: false,
            isVulnerable: false,
            isDirectQuestion: false,
            isLowEffort: true,
            isGeoRelated: false,
            suggestedResponseStyle: 'playful',
            questionInfo: {
                isQuestion: false,
                count: 0,
                type: 'none'
            },
        };
    }

    const doc = nlp(lastMessageFromMatch.content);
    const subtext = analyzeMessageSubtext(doc);
    const questionInfo = analyzeQuestion(doc);
    DEBUG.log('SUBTEXT', 'Last message analysis complete', {
        content: lastMessageFromMatch.content,
        questionInfo,
        subtext
    });

    return {
        ...subtext,
        isDirectQuestion: questionInfo.isQuestion,
        questionInfo: questionInfo,
        isLowEffort: isLowEffortReply(lastMessageFromMatch.content),
        isGeoRelated: isMessageGeoRelated(lastMessageFromMatch.content),
        suggestedResponseStyle: suggestStyleFromText(lastMessageFromMatch.content),
    };
}

// ===================================================================================
// SECTION 2: DYNAMIC MEMORY MANAGEMENT
// ===================================================================================

/**
 * Updates the memory object based on the entire conversation history.
 * @param {Message[]} conversationHistory
 * @param {MatchMemory} storedMemory
 * @returns {MatchMemory} The updated memory object.
 */
function updateMemoryFromHistory(conversationHistory, storedMemory) {
    let memory = JSON.parse(JSON.stringify(storedMemory || {
                topics: {},
                insideJokes: [],
                avoidedTopics: [],
                questionHistory: [],
                dateArcPhase: 'rapport'
            }));

    for (let i = 0; i < conversationHistory.length - 1; i++) {
        if (conversationHistory[i].role === 'user' && conversationHistory[i + 1].role === 'assistant') {
            const userDoc = nlp(conversationHistory[i].content);
            const matchDoc = nlp(conversationHistory[i + 1].content);
            const subtext = analyzeMessageSubtext(matchDoc);
            const genericNouns = new Set(['thing', 'things', 'point', 'weekend', 'week', 'day', 'bit', 'lot', 'way', 'time', 'place', 'stuff', 'item', 'items', 'object', 'objects', 'article', 'articles', 'entity', 'entities', 'unit', 'units', 'device', 'gadget', 'gear', 'kit', 'tackle', 'hardware', 'goods', 'wares', 'commodity', 'product', 'material', 'substance', 'contraption', 'apparatus', 'equipment', 'paraphernalia', 'junk', 'idea', 'ideas', 'concept', 'concepts', 'notion', 'thought', 'thoughts', 'subject', 'topic', 'matter', 'issue', 'issues', 'concern', 'concerns', 'aspect', 'aspects', 'element', 'elements', 'factor', 'factors', 'case', 'cases', 'deal', 'gist', 'story', 'angle', 'vibe', 'business', 'detail', 'details', 'information', 'info', 'data', 'fact', 'facts', 'news', 'scoop', 'amount', 'quantity', 'number', 'bunch', 'load', 'loads', 'heap', 'heaps', 'pile', 'piles', 'ton', 'tons', 'mass', 'chunk', 'hunk', 'piece', 'pieces', 'portion', 'share', 'slice', 'segment', 'section', 'part', 'parts', 'fraction', 'fragment', 'smidgen', 'tad', 'dash', 'hint', 'touch', 'couple', 'few', 'series', 'set', 'collection', 'array', 'assortment', 'selection', 'variety', 'person', 'people', 'individual', 'individuals', 'character', 'characters', 'guy', 'guys', 'dude', 'dudes', 'chap', 'chaps', 'bloke', 'fellow', 'body', 'bodies', 'soul', 'souls', 'head', 'heads', 'folk', 'folks', 'crowd', 'gang', 'crew', 'squad', 'team', 'party', 'bunch', 'lot', 'situation', 'scenario', 'circumstance', 'circumstances', 'state', 'affair', 'affairs', 'event', 'events', 'happening', 'incident', 'occurrence', 'episode', 'development', 'predicament', 'dilemma', 'problem', 'problems', 'trouble', 'mess', 'jam', 'pickle', 'ordeal', 'experience', 'spot', 'location', 'area', 'zone', 'region', 'site', 'venue', 'joint', 'moment', 'minute', 'second', 'hour', 'period', 'era', 'age', 'while', 'instant', 'jiffy', 'stretch', 'spell', 'thingy', 'thingie', 'thingamajig', 'thingamabob', 'whatchamacallit', 'doodad', 'doohickey', 'gizmo', 'widget', 'whatsit', 'whatnot', 'jawn', 'shit', 'crap', 'bullshit', 'fuckery', 'shitshow', 'clusterfuck', 'fiasco', 'shitstorm', 'mess', 'shitload', 'fuckload', 'assload', 'fuck-ton', 'metric-fuck-ton', 'bastard', 'fucker', 'motherfucker', 'son of a bitch']);
            const potentialTopics = userDoc.nouns().toSingular().out('array').filter(n => !genericNouns.has(n) && n.length > 2);

            if (potentialTopics.length > 0) {
                const scoreChange = subtext.valence + (subtext.arousal * 0.5);
                const matchNouns = new Set(matchDoc.nouns().toSingular().out('array'));

                potentialTopics.forEach(topic => {
                    if (!memory.topics[topic]) {
                        memory.topics[topic] = {
                            score: 0,
                            mentions: 0,
                            lastMentionIndex: 0
                        };
                    }
                    let currentScoreChange = scoreChange;
                    if (matchNouns.has(topic)) {
                        currentScoreChange *= 1.5;
                        DEBUG.log('MEMORY', `Topic "${topic}" confirmed by match, boosting score.`);
                    }
                    memory.topics[topic].score += currentScoreChange;
                    memory.topics[topic].mentions += 1;
                    memory.topics[topic].lastMentionIndex = i;
                });
            }

            if (subtext.intents.includes('reacting_to_humor') && subtext.valence > 0.5) {
                const userSentences = userDoc.sentences();
                const jokeSentence = userSentences.isStatement().last();
                if (jokeSentence.found) {
                    const jokeText = jokeSentence.text('reduced');
                    if (!memory.insideJokes.includes(jokeText)) {
                        memory.insideJokes.push(jokeText);
                        DEBUG.log('MEMORY', 'New inside joke detected and saved.', jokeText);
                    }
                }
            }

            const questionInfo = analyzeQuestion(userDoc);
            if (questionInfo.isQuestion) {
                const questionText = userDoc.text('reduced');
                if (!memory.questionHistory.includes(questionText)) {
                    memory.questionHistory.push(questionText);
                }
            }
        }
    }

    const historyLength = conversationHistory.length;
    for (const topic in memory.topics) {
        if (historyLength - (memory.topics[topic].lastMentionIndex || 0) > 10) {
            memory.topics[topic].score *= 0.9;
        }
        if (memory.topics[topic].score < -1.5 && !memory.avoidedTopics.includes(topic)) {
            memory.avoidedTopics.push(topic);
        }
    }

    const historySubtexts = conversationHistory.map(msg => analyzeMessageSubtext(nlp(msg.content)));
    const flirtSignalsInHistory = historySubtexts.filter(s => s.intents.includes('flirting_or_sexual')).length;
    const logisticsSignalsInHistory = historySubtexts.filter(s => s.intents.includes('planning')).length;

    if (memory.dateArcPhase === 'rapport' && flirtSignalsInHistory >= 2) {
        memory.dateArcPhase = 'escalation';
        DEBUG.log('MEMORY', 'Date Arc Phase advanced to: escalation');
    }
    if (memory.dateArcPhase === 'escalation' && logisticsSignalsInHistory >= 1) {
        memory.dateArcPhase = 'planning';
        DEBUG.log('MEMORY', 'Date Arc Phase advanced to: planning');
    }

    DEBUG.log('MEMORY', 'Memory update complete.', memory);
    return memory;
}

// ===================================================================================
// SECTION 3: TOP-LEVEL ORCHESTRATOR
// ===================================================================================

/**
 * @param {Message[]} conversationHistory
 * @param {MatchMemory} storedMemory
 * @returns {{updatedMemory: MatchMemory, lastMessageAnalysis: LastMessageAnalysis}}
 */
export function runFullConversationAnalysis(conversationHistory, storedMemory) {
    DEBUG.log('ANALYSIS', 'Starting full conversation analysis...');
    const updatedMemory = updateMemoryFromHistory(conversationHistory, storedMemory);
    const lastMessageAnalysis = analyzeLastMessageForSubtext(conversationHistory);
    DEBUG.log('ANALYSIS', 'Full analysis finished.');
    return {
        updatedMemory,
        lastMessageAnalysis
    };
}

// ===================================================================================
// SECTION 4: HELPER FUNCTIONS
// ===================================================================================

/**
 * @param {Message[]} conversationHistory
 * @returns {ConversationState}
 */
export function determineConversationState(conversationHistory) {
    const messageCount = conversationHistory?.length || 0;
    if (messageCount === 0) {
        DEBUG.log('STATE', 'Determined state: OPENER (no history)');
        return 'OPENER';
    }

    const lastMessage = conversationHistory[messageCount - 1];
    const TWO_DAYS = 24 * 2,
    ONE_WEEK = 24 * 7,
    ONE_MONTH = 24 * 30;

    const hoursSinceMatchReply = calculateHoursSinceMatchReply(conversationHistory);
    const staleGapInHours = calculateStaleConversationGap(conversationHistory);
    let state = 'ACTIVE_CONVO';
    if (lastMessage.role === 'user') {
        if (hoursSinceMatchReply >= ONE_MONTH)
            state = 'REENGAGING_MONTH';
        else if (hoursSinceMatchReply >= ONE_WEEK)
            state = 'REENGAGING_WEEK';
        else if (hoursSinceMatchReply >= TWO_DAYS)
            state = 'REENGAGING_DAY';
    }
    if (lastMessage.role === 'assistant') {
        if (staleGapInHours >= ONE_MONTH)
            state = 'REENGAGING_MONTH';
        else if (staleGapInHours >= ONE_WEEK)
            state = 'REENGAGING_WEEK';
        else if (staleGapInHours >= TWO_DAYS)
            state = 'REENGAGING_DAY';
    }

    if (state === 'ACTIVE_CONVO' && messageCount < 5) {
        state = 'EARLY_CONVO';
    }

    DEBUG.log('STATE', `Determined state: ${state}`, {
        messageCount,
        hoursSinceMatchReply,
        staleGapInHours
    });
    return state;
}
function calculateHoursSinceMatchReply(conversationHistory) {
    const lastMatchMessage = conversationHistory?.filter(msg => msg.role === 'assistant').pop();
    if (!lastMatchMessage || !lastMatchMessage.date)
        return Infinity;
    try {
        return (new Date() - new Date(lastMatchMessage.date)) / (1000 * 60 * 60);
    } catch (e) {
        return Infinity;
    }
}

function calculateStaleConversationGap(conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2)
        return 0;
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const secondToLastMessage = conversationHistory[conversationHistory.length - 2];
    if (!lastMessage.date || !secondToLastMessage.date)
        return 0;
    try {
        return (new Date(lastMessage.date) - new Date(secondToLastMessage.date)) / (1000 * 60 * 60);
    } catch (e) {
        return 0;
    }
}

/**
 * @param {object} doc
 * @returns {{isQuestion: boolean, count: number, type: string}}
 */
function analyzeQuestion(doc) {
    const sentences = doc.sentences();
    if (!sentences.found)
        return {
            isQuestion: false,
            count: 0,
            type: 'none'
        };

    const questionsWithMark = sentences.isQuestion();
    if (questionsWithMark.length > 0) {
        DEBUG.log('QUESTION', 'Question detected by punctuation.', {
            count: questionsWithMark.length
        });
        return {
            isQuestion: true,
            count: questionsWithMark.length,
            type: 'direct'
        };
    }
    const interrogatives = /^(?:what the (?:fuck|hell|heck|actual fuck)|how the (?:fuck|hell)|how (?:come|long|far|much|many|often|old|big|fast|soon|about|else)|what (?:kind|sort|type|time|color|colour|if|about|for|else|part|reason)|which (?:one|way)|(wh(?:at|ere|en|y|ich|o|om|ose))|(are|is|am|was|were|do|does|did|ca|could|will|would|should|have|has|had|may|might|must)n't|(are|is|am|was|were|do|does|did|can|could|will|would|should|have|has|had|may|might|must)|ain't|got a|you (?:sure|kidding|serious)|any (?:chance|idea)|for real|seriously|really|pardon|excuse me|so|and|well|right|yeah|no)\b/i;
    const impliedQuestionPhrases = new Set(['you', 'and you', 'n you', 'u', 'n u', 'yourself', 'and yourself', 'how about you', 'what about you', 'how bout you', 'what bout you', 'and for you', 'for you', 'you guys', 'and you guys', 'you all', 'and you all', 'y\'all', 'and y\'all', 'what about you guys', 'what about y\'all', 'how about you guys', 'how about y\'all', 'what about everyone else', 'and everyone else', 'thoughts', 'opinions', 'and you?', 'right', 'yeah', 'yes', 'no', 'correct', 'true', 'innit', 'eh', 'huh', 'you know', ' you see ', ' you feel me ', ' feel me ', ' really ', ' seriously ', ' for real ', ' no way ', ' get out ', ' get out of here ', ' stop it ', ' you \' re kidding ', ' you \'re joking', 'pardon', 'excuse me', 'wait', 'hold on', 'wait, what', 'say what', 'and', 'so', 'well', 'and then', 'go on', 'and so', 'which means', 'meaning', 'because', 'the fuck', 'what the fuck', 'da fuck', 'tf', 'wtf', 'the hell', 'what the hell', 'wth', 'the actual fuck', 'bullshit', 'bs', 'no fucking way', 'nfw', 'are you fucking serious', 'are you fucking kidding me', 'r u fucking kidding me', ]);
    for (const sentence of sentences.out('array')) {
        if (interrogatives.test(sentence.trim())) {
            DEBUG.log('QUESTION', 'Question detected by interrogative word.', {
                sentence
            });
            return {
                isQuestion: true,
                count: 1,
                type: 'interrogative'
            };
        }
    }

    const processedText = doc.text('reduced');
    if (impliedQuestionPhrases.has(processedText)) {
        DEBUG.log('QUESTION', 'Implied question detected.', {
            originalText: doc.text(),
            processedText: processedText
        });
        return {
            isQuestion: true,
            count: 1,
            type: 'implied'
        };
    }

    return {
        isQuestion: false,
        count: 0,
        type: 'none'
    };
}

function detectLogisticsSignal(doc) {
    const logisticsVerbs = ['get', 'grab', 'meet', 'hang out', 'do', 'go', 'have', 'catch', 'make', 'take', 'share', 'join', 'come by', 'come over', 'come through', 'drop by', 'stop by', 'swing by', 'head to', 'head over', 'roll through', 'pop in', 'show up', 'make it', 'get to', 'arrive', 'be at', 'get together', 'link up', 'meet up', 'catch up', 'kick it', 'chill', 'vibe', 'connect', 'hit up', 'hit', 'scoop', 'slide', 'post up', 'arrange', 'schedule', 'organize', 'coordinate', 'convene', 'assemble', 'attend', 'gather', 'fuck with', 'mess with', ];
    const logisticsNouns = ['drink', 'drinks', 'coffee', 'dinner', 'lunch', 'brunch', 'breakfast', 'food', 'a meal', 'a bite', 'something to eat', 'tea', 'a beer', 'beers', 'cocktails', 'a round', 'apps', 'a movie', 'the movies', 'a game', 'the game', 'a show', 'a concert', 'a party', 'the party', 'the event', 'the function', 'the move', 'the spot', 'a walk', 'a hike', 'a workout', 'sometime', 'soon', 'later', 'some point', 'at some point', 'one day', 'one of these days', 'in a bit', 'in the future', 'eventually', 'down the road', 'whenever', 'weekend', 'the weekend', 'this weekend', 'next weekend', 'friday', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'fri', 'sat', 'sun', 'mon', 'tues', 'weds', 'thurs', 'tonight', 'tn', 'tomorrow', 'tmrw', 'today', 'the morning', 'morning', 'am', 'the afternoon', 'afternoon', 'pm', 'the evening', 'evening', 'night', 'the night', 'this week', 'next week', 'the week', 'a weekday', 'this month', 'next month', 'the holiday', 'the break', 'later on', 'in an hour', 'my place', 'your place', 'my spot', 'your spot', 'mine', 'yours', 'the bar', 'the cafe', 'the restaurant', 'the club', 'downtown', 'town', ];
    const logisticsQuestions = ['are you free', 'when are you free', 'are you available', 'what\'s your availability', 'you free', 'u free', 'got time', 'got a minute', 'got a sec', 'have time', 'free on', 'free this', 'free for', 'availability?', 'what are you up to', 'busy this week', 'what you up to', 'what are your plans', 'what\'s your plan', 'any plans', 'got plans', 'what you got going on', 'what\'s the plan', 'what\'s your schedule like', 'how\'s your week looking', 'what\'s happening', 'wanna get', 'wanna grab', 'wanna go', 'do you want to', 'want to', 'down for', 'down to', 'up for', 'up to', 'feel like', 'how about', 'what about', 'should we', 'are we getting', 'we still on for', 'care to join', 'wyd', 'wuu2', 'what we doing', 'what we on', 'what\'s good', 'what\'s goodie', 'what\'s the move', 'what\'s the motive', 'you tryna', 'you down', 'u down', 'you with it', 'so, what\'s the plan', 'what the fuck are you up to', 'what the fuck is the plan', 'where the fuck are you', 'where the hell are you', 'what the fuck are we doing', 'are you fucking busy', 'when the fuck are you free', ];
    if (doc.has(logisticsQuestions))
        return true;
    if (doc.verbs().has(logisticsVerbs) && doc.nouns().has(logisticsNouns))
        return true;
    return false;
}

export function isMessageGeoRelated(text) {
    if (!text)
        return false;
    const doc = nlp(text.toLowerCase());
    if (doc.places().found)
        return true;
    const geoTriggers = ['where', 'from', 'at', 'in', 'on', 'near', 'by', 'around', 'to', 'live', 'lives', 'living', 'reside', 'resides', 'residence', 'home', 'hometown', 'homeland', 'based', 'staying', 'grew up', 'born in', 'raised in', 'from', 'native', 'local', 'nationality', 'citizenship', 'roots', 'background', 'travel', 'traveling', 'traveled', 'visit', 'visiting', 'trip', 'vacation', 'holiday', 'journey', 'tour', 'expedition', 'voyage', 'pilgrimage', 'excursion', 'getaway', 'go', 'went', 'going', 'fly', 'flew', 'flying', 'drive', 'drove', 'driving', 'commute', 'commuting', 'relocate', 'relocating', 'move', 'moved', 'moving', 'emigrate', 'immigrate', 'abroad', 'overseas', 'destination', 'itinerary', 'route', 'path', 'country', 'nation', 'state', 'province', 'county', 'city', 'town', 'village', 'municipality', 'district', 'territory', 'capital', 'border', 'continent', 'region', 'area', 'zone', 'hemisphere', 'coast', 'island', 'peninsula', 'mountain', 'valley', 'desert', 'forest', 'jungle', 'ocean', 'sea', 'river', 'lake', 'located', 'location', 'place', 'spot', 'venue', 'site', 'address', 'building', 'office', 'campus', 'headquarters', 'hq', 'airport', 'station', 'port', 'hotel', 'resort', 'park', 'neighborhood', 'suburb', 'north', 'south', 'east', 'west', 'northern', 'southern', 'eastern', 'western', 'upstate', 'downstate', 'uptown', 'downtown', 'midtown', 'central', 'remote', 'nearby', 'local', 'distant', 'abroad', 'overseas', 'here', 'there', 'everywhere', 'somewhere', 'anywhere', 'nowhere', 'position', 'coordinates', 'latitude', 'longitude', 'lat', 'long', 'gps', 'map', 'atlas', 'globe', 'directions', 'geography', 'geolocation', 'geotag', 'geofence', 'locale', 'jurisdiction', 'branch', 'outlet', 'market', 'territory', 'shipping', 'delivery', 'origin', 'destination', 'address', 'street', 'road', 'avenue', 'boulevard', 'lane', 'drive', 'court', 'place', 'zip code', 'postal code', 'postcode', 'p.o. box', 'hood', 'neck of the woods', 'stomping grounds', 'turf', 'zone', 'ends', 'area code', 'the sticks', 'the burbs', 'back home', ];
    return doc.has(geoTriggers);
}

export function isLowEffortReply(text) {
    if (!text)
        return true;
    const cleanedText = text.trim().toLowerCase();
    if (cleanedText.length < 15)
        return true;
    const lowEffortWords = new Set(['ok', 'okay', 'oki', 'okie', 'k', 'kk', 'kay', 'yep', 'yup', 'yuppers', 'yeah', 'ya', 'yah', 'aight', 'alright', 'alrighty', 'gotcha', 'got it', 'i see', 'isee', 'ah', 'aha', 'understood', 'word', 'lol', 'lolz', 'haha', 'hehe', 'ha', 'he', 'cool', 'nice', 'sweet', 'dope', 'sick', 'lit', 'cute', 'love it', 'amazing', 'awesome', 'thx', 'thanks', 'ty', 'tysm', 'np', 'yw', 'idk', 'idek', 'ofc', 'atm', 'rn', 'fr', 'hbu', 'wbu', 'wyd', 'nm', 'gn', 'gm', 'gl', 'gg', 'lmao', 'lmfao', 'rofl', '👍', '👌', '😂', '❤️', '🔥', '💯', '🙏', '🤣', '😁', '😊', '😉', '💀', '🙂', '✅', '✔️', 'noted', 'copy', 'copy that', 'roger', 'roger that', 'received', 'acknowledged', 'will do', 'sounds good', 'sg', 'sgtm', 'perfect', 'done', 'hmm', 'hm', 'huh', 'oh', 'well', 'fair', 'fair enough', 'true', 'valid', 'i guess', 'i suppose', 'maybe', 'perhaps', 'possibly', '...', 'k.', 'fine.', 'fine', 'whatever', 'w/e', 'sure.', 'sure', 'idc', 'cool.', 'nice.', 'wow.', 'lol.', '.', ]);
    const wordsInText = cleanedText.split(/\s+/);
    return wordsInText.every(word => lowEffortWords.has(word.replace(/[.,!?-]/g, '')));
}

function suggestStyleFromText(text) {
    if (!text)
        return 'playful';
    const doc = nlp(text);
    if (analyzeQuestion(doc).isQuestion)
        return 'direct';
    if (doc.wordCount() < 6)
        return 'witty';
    if (doc.adjectives().length > 3 || doc.wordCount() > 40)
        return 'charming';
    if (doc.has('#Humor') || text.toLowerCase().includes('haha') || text.toLowerCase().includes('lol'))
        return 'playful';
    return 'casual';
}

export function hasRecentGreeting(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0)
        return false;
    const todayDateString = new Date().toISOString().split('T')[0];
    const GREETING_KEYWORDS = ['hey', 'hi', 'hello', 'yo', 'sup', 'hiya', 'heya', 'howdy', 'wassup', 'what up', 'what\'s up', 'greetings', 'salutations', 'aloha', 'ahoy', 'good morning', 'morning', "'morning", 'good afternoon', 'afternoon', 'good evening', 'evening', 'good day', 'how are you', 'how are ya', 'how you doing', 'how you doin', 'how\'s it going', 'hows it going', 'how is it going', 'how have you been', 'how\'s things', 'how\'s life', 'what\'s new', 'what\'s good', 'what\'s goodie', 'what\'s happening', 'what\'s crackin', 'what\'s poppin', 'long time no see', 'nice to see you', 'nice to meet you', 'pleasure to meet you', 'dear', 'to whom it may concern', 'attention', 'welcome', 'gm', 'gn', 'yerrr', 'o/', '\\o', 'hewwo', 'henlo', 'g\'day', 'howzit', 'alright?', 'u alright?', 'wagwan', 'ey up', 'what\'s the craic?', 'cheers', 'hiya pal', 'top of the morning to ya', 'oi', 'psst', 'ahem', 'excuse me', 'yo, asshole', 'hey, fucker', 'sup, bitches', 'look here', 'what do you want', ];
    return conversationHistory.some(msg => {
        if (!msg.date || !msg.date.startsWith(todayDateString))
            return false;
        const firstWord = msg.content.trim().toLowerCase().split(' ')[0].replace(/[.,!?-]/g, '');
        return GREETING_KEYWORDS.includes(firstWord);
    });
}

export function getToneDescription(value) {
    const levels = {
        100: 'Be explicitly sexual and daring.',
        90: 'Be intensely flirty and bold.',
        80: 'Be very flirty and confident.',
        70: 'Be flirty and playful.',
        60: 'Be moderately flirty and engaging.',
        50: 'Be lightly flirty and casually engaging.',
        40: 'Be friendly and approachable.',
        30: 'Be warm and relaxed.',
        20: 'Be polite and friendly.',
        10: 'Be polite and straightforward.',
        0: 'Be completely neutral and formal.'
    };
    return levels[Object.keys(levels).reverse().find(k => value >= k) || 0];
}

export function getLengthDescription(value) {
    const levels = {
        100: 'Strictly 8+ sentences (a manifesto).',
        90: 'Strictly 6–7 sentences (epic).',
        80: 'Strictly 5–6 sentences (very long).',
        70: 'Strictly 4–5 sentences (long).',
        60: 'Strictly 3–4 sentences (moderately long).',
        50: 'Strictly 2–3 sentences (medium).',
        40: 'Strictly 2 sentences (moderately short).',
        30: 'Strictly 1–2 sentences (short).',
        20: 'Strictly one full sentence (very short).',
        10: 'Strictly 5–10 words (ultra short).',
        0: 'Strictly 2–5 words (micro).'
    };
    return levels[Object.keys(levels).reverse().find(k => value >= k) || 0];
}

export function getStyleDescription(style, analysis) {
    if (style === 'auto' && analysis?.lastMessageAnalysis?.suggestedResponseStyle) {
        return `Strictly adopt a ${analysis.lastMessageAnalysis.suggestedResponseStyle} style.`;
    }
    const styles = {
        'witty': 'Write with a witty and humorous style.',
        'intellectual': 'Write with an intellectual and deep style.',
        'playful': 'Write with a playful and teasing style.',
        'direct': 'Write with a direct and confident style.',
        'poetic': 'Write with a poetic and romantic style.',
        'sexual': 'Write with a bold, provocative and sexual style.',
        'sarcastic': 'Write with a sarcastic and sharp style.',
        'charming': 'Write with a charming and suave style.',
        'casual': 'Write with a casual and laid-back style.',
        'mysterious': 'Write with a mysterious and intriguing style.'
    };
    return styles[style] || 'Write with a natural and conversational style.';
}

export function getEmojiInstruction(strategy, flirtyValue, linguisticStyle) {
    if (!strategy || strategy === 'no_emoji')
        return '';
    const autoDesc = () => {
        if (['intellectual', 'poetic', 'sarcastic'].includes(linguisticStyle))
            return 'Avoid emojis almost entirely.';
        if (flirtyValue >= 80)
            return 'Feel free to use 1-3 bold or suggestive emojis (e.g., 😏, 😈, 🔥).';
        if (flirtyValue >= 60)
            return 'Incorporate one or two well-placed, playful emojis (e.g., 😉, 😂, 😜).';
        if (flirtyValue >= 40)
            return 'You may use a single, simple, and friendly emoji (e.g., 🙂, 👍).';
        if (['playful', 'witty', 'charming'].includes(linguisticStyle))
            return 'You can use one well-placed emoji to add personality.';
        return 'Be very conservative with emojis.';
    };
    const map = {
        'auto': autoDesc(),
        'friendly': 'You may use a single, simple, and friendly emoji (e.g., 🙂, 👍).',
        'playful': 'Incorporate one or two well-placed, playful emojis (e.g., 😉, 😂).',
        'bold': 'Feel free to use 1-3 bold or suggestive emojis (e.g., 😏, 😈, 🔥).'
    };
    return map[strategy] || '';
}

export function getTimeContext() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    let dayPeriod = hour < 5 ? 'late night' : hour < 8 ? 'early morning' : hour < 12 ? 'morning' : hour < 14 ? 'afternoon' : hour < 17 ? 'late afternoon' : hour < 19 ? 'evening' : hour < 22 ? 'late evening' : 'night';
    if (day === 0 || day === 6 || (day === 5 && hour >= 17)) {
        return `It's the weekend, ${dayName}(${dayPeriod}). You can use a more relaxed, fun-oriented greeting.`;
    }
    if (day >= 1 && day <= 5) {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
        return `It's a weekday, ${dayName} - ${dayPeriod}. A casual check-in about their day or a light greeting (e.g., "Happy ${dayName}!") is appropriate.`;
    }
    return null;
}
