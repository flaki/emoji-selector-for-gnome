//this file is part of https://github.com/maoschanz/emoji-selector-for-gnome

const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;

/* Import the current extension, mainly because we need to access other files */
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const SkinTonesBar = Me.imports.emojiOptionsBar.SkinTonesBar;
const Extension = Me.imports.extension;
const EmojiButton = Me.imports.emojiButton;

/**
 * This imports data (array of arrays of characters, and array of arrays
 * of strings). Keywords are used for both:
 * - search
 * - skin tone management
 * - gender management
 */
const EMOJIS_CHARACTERS = Me.imports.data.emojisCharacters.ALL;
const EMOJIS_KEYWORDS = Me.imports.data.emojisKeywords.ALL_KEYWORDS;

var EmojiCategory = class EmojiCategory {

	/**
	 * The category and its button have to be built without being loaded, to
	 * memory issues with emojis' image textures.
	 */
	constructor(categoryName, iconName, id) {
		this.super_item = new PopupMenu.PopupSubMenuMenuItem(categoryName);
		this.categoryName = categoryName;
		this.id = id;

		this.super_item.actor.visible = false;
		this.super_item.actor.reactive = false;
		this.super_item._triangleBin.visible = false;

		this.emojiButtons = []; // used for searching, and for updating the size/style

		// These options bar widgets have the same type for all categories to
		// simplify the update method
		if ((this.id == 1) || (this.id == 5)) {
			this.skinTonesBar = new SkinTonesBar(true);
		} else {
			this.skinTonesBar = new SkinTonesBar(false);
		}

		//	Smileys & body		Peoples			Activities
		if ((this.id == 0) || (this.id == 1) || (this.id == 5)) {
			this.skinTonesBar.addBar(this.super_item.actor);
		}

		this.categoryButton = new St.Button({
			reactive: true,
			can_focus: true,
			track_hover: true,
			accessible_name: categoryName,
			style_class: 'EmojisCategory',
			child: new St.Icon({ icon_name: iconName }),
		});
		this.categoryButton.connect('clicked', this._toggle.bind(this));
		this.categoryButton.connect('notify::hover', this._onHover.bind(this));

		this._built = false; // will be true once the user opens the category
		this._loaded = false; // will be true once loaded
		this.validateKeywordsNumber();
		this.load();
	}

	validateKeywordsNumber() {
		if (EMOJIS_CHARACTERS[this.id].length !== EMOJIS_KEYWORDS[this.id].length) {
			log("Incorrect number of keywords for category " + this.categoryName)
			log(EMOJIS_CHARACTERS[this.id].length + " emojis");
			log(EMOJIS_KEYWORDS[this.id].length + " keyword arrays");
		}
	}

	/**
	 * EmojiButtons objects are built here and loaded into an array, but not
	 * packed into a container, thus not added to the Clutter stage and not
	 * rendered. They will when the user will click on the button.
	 */
	load() {
		if (this._loaded) { return; }
		let ln, container;
		for (let i = 0; i < EMOJIS_CHARACTERS[this.id].length; i++) {
			let button = new EmojiButton.EmojiButton(
			        EMOJIS_CHARACTERS[this.id][i], EMOJIS_KEYWORDS[this.id][i]);
			this.emojiButtons.push(button);
		}
		this._loaded = true;
	}

	clear() {
		this.super_item.menu.removeAll();
		this.emojiButtons = [];
	}

	searchEmoji(searchedText, neededresults, priority) {
		let searchResults = [];
		for (let i = 0; i < this.emojiButtons.length; i++) {
			if (neededresults >= 0) {
				let isMatching = false;
				if (priority === 3) {
					isMatching = this.searchExactMatch(searchedText, i);
				} else if (priority === 2) {
					isMatching = this.searchInName(searchedText, i);
				} else {
					isMatching = this.searchInKeywords(searchedText, i);
				}
				if (isMatching){
					searchResults.push(this.emojiButtons[i].baseCharacter)
					neededresults--;
				}
			}
		}
		return searchResults
	}

	searchExactMatch(searchedText, i) {
		return this.emojiButtons[i].keywords[0] === searchedText;
	}

	searchInName(searchedText, i) {
		if (this.emojiButtons[i].keywords[0].includes(searchedText)) {
			// If the name corresponds to the searched string, but it is also an
			// exact match, we can assume the emoji is already in the displayed
			// result.
			return !this.searchExactMatch(searchedText, i);
		}
		return false;
	}

	searchInKeywords(searchedText, i) {
		for (let k = 1; k < this.emojiButtons[i].keywords.length; k++) {
			if (this.emojiButtons[i].keywords[k].includes(searchedText)) {
				// If a keyword corresponds to the searched string, but the name
				// corresponds too, we can assume the emoji is already in the
				// displayed result.
				return !this.searchInName(searchedText, i);
			}
		}
		return false;
	}

	/**
	 * Builds the submenu, and fill it with containers full of EmojiButtons
	 * previously built.
	 */
	build() {
		if (this._built) { return; }
		let ln, container;
		for (let i=0; i<this.emojiButtons.length; i++) {
			// lines of emojis
			if (i % Extension.NB_COLS === 0) {
				ln = new PopupMenu.PopupBaseMenuItem({
					style_class: 'EmojisList',
					reactive: false,
					can_focus: false,
				});
				ln.actor.track_hover = false;
				container = new St.BoxLayout();
				ln.actor.add(container, { expand: true });
				this.super_item.menu.addMenuItem(ln);
			}
			this.emojiButtons[i].build(this);
			container.add_child(this.emojiButtons[i].super_btn);
		}
		this._built = true;
	}

//	unload() { // TODO
//		this._built = false;
//		this._loaded = false;
//		for (let i=0; i<this.emojiButtons.length; i++) {
//			this.emojiButtons[i].destroy();
//		}
//		this.super_item.menu.removeAll();
//		this.emojiButtons = [];
//	}

	_toggle() {
		if (this.super_item._getOpenState()) {
			Extension.GLOBAL_BUTTON.clearCategories();
		} else {
			this._openCategory();
		}
	}

	_onHover(a, b) {
		if (a.hover) {
			this.categoryButton.style = 'background-color: rgba(200, 200, 200, 0.2);';
		} else if (this.super_item._getOpenState()) {
			this.categoryButton.style = 'background-color: rgba(0, 0, 100, 0.2);';
		} else {
			this.categoryButton.style = '';
		}
	}

	_openCategory() {
		Extension.GLOBAL_BUTTON.clearCategories();
		this.super_item.label.text = this.categoryName;

		if(!this._built) { this.build(); }

		this.skinTonesBar.update();

		this.categoryButton.style = 'background-color: rgba(0, 0, 200, 0.2);';
		this.super_item.actor.visible = true;
		this.super_item.setSubmenuShown(true);
		Extension.GLOBAL_BUTTON._activeCat = this.id;
		Extension.GLOBAL_BUTTON._onSearchTextChanged();
	}

	getButton() {
		return this.categoryButton;
	}
}

