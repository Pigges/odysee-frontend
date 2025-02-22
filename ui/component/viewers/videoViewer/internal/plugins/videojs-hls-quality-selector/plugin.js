/* eslint-disable */
import videojs from 'video.js';
import { version as VERSION } from './package.json';
import ConcreteButton from './ConcreteButton';
import ConcreteMenuItem from './ConcreteMenuItem';

// Default options for the plugin.
const defaults = {};

// Cross-compatibility for Video.js 5 and 6.
const registerPlugin = videojs.registerPlugin || videojs.plugin;

/**
 * VideoJS HLS Quality Selector Plugin class.
 */
class HlsQualitySelectorPlugin {
  /**
   * Plugin Constructor.
   *
   * @param {Player} player - The videojs player instance.
   * @param {Object} options - The plugin options.
   */
  constructor(player, options) {
    this.player = player;
    this.config = options;

    // Ensure dependencies are met
    if (!this.player.qualityLevels) {
      console.error(`Error: Missing video.js quality levels plugin (required) - videojs-hls-quality-selector`);
      return;
    }

    this.setupPlugin();
  }

  setupPlugin() {
    // Create the quality button.
    this.createQualityButton();

    // Hide quality selector by default
    this._qualityButton.hide();

    // Bind event listeners
    this.bindPlayerEvents();

    // Listen for source changes
    this.player.on('loadedmetadata', (e) => {
      this.updatePlugin();
    });
  }

  updatePlugin() {
    if (this.player.claimSrcVhs || this.player.isLivestream) {
      this._qualityButton.show();
    } else {
      this._qualityButton.hide();
    }
  }

  /**
   * Deprecated, returns VHS plugin
   *
   * @return {*} - videojs-http-streaming plugin.
   */
  getHls() {
    console.warn('hls-quality-selector: WARN: Using getHls options is deprecated. Use getVhs instead.');
    return this.getVhs();
  }

  /**
   * Returns VHS Plugin
   *
   * @return {*} - videojs-http-streaming plugin.
   */
  getVhs() {
    return this.player.tech({ IWillNotUseThisInPlugins: true }).vhs;
  }

  /**
   * Binds listener for quality level changes.
   */
  bindPlayerEvents() {
    this.player.qualityLevels().on('addqualitylevel', this.onAddQualityLevel.bind(this));
  }

  /**
   * Adds the quality menu button to the player control bar.
   */
  createQualityButton() {
    const player = this.player;

    this._qualityButton = new ConcreteButton(player);

    const placementIndex = player.controlBar.children().length - 2;
    const concreteButtonInstance = player.controlBar.addChild(
      this._qualityButton,
      { componentClass: 'qualitySelector' },
      this.config.placementIndex || placementIndex
    );

    concreteButtonInstance.addClass('vjs-quality-selector');
    if (!this.config.displayCurrentQuality) {
      const icon = ` ${this.config.vjsIconClass || 'vjs-icon-hd'}`;

      concreteButtonInstance.menuButton_.$('.vjs-icon-placeholder').className += icon;
    } else {
      this.setButtonInnerText('auto');
    }
    concreteButtonInstance.removeClass('vjs-hidden');
  }

  resolveOriginalQualityLabel(abbreviatedForm, includeResolution) {
    if (includeResolution && this.config.originalHeight) {
      return abbreviatedForm
        ? __('Orig (%quality%) --[Video quality popup. Short form.]--', { quality: this.config.originalHeight + 'p' })
        : __('Original (%quality%) --[Video quality popup. Long form.]--', {
            quality: this.config.originalHeight + 'p',
          });
    } else {
      // The allocated space for the button is fixed and happened to fit
      // "Original", so we don't abbreviate for English. But it will most likely
      // not fit for other languages, hence the 2 strings.
      return abbreviatedForm
        ? __('Original --[Video quality button. Abbreviate to fit space.]--')
        : __('Original --[Video quality button. Long form.]--');
    }
  }

  /**
   *Set inner button text.
   *
   * @param {string} text - the text to display in the button.
   */
  setButtonInnerText(text) {
    let str;
    switch (text) {
      case 'auto':
        str = __('Auto --[Video quality. Short form]--');
        break;
      case 'original':
        str = this.resolveOriginalQualityLabel(true, false);
        break;
      default:
        str = text;
        break;
    }

    this._qualityButton.menuButton_.$('.vjs-icon-placeholder').innerHTML = str;
  }

  /**
   * Builds individual quality menu items.
   *
   * @param {Object} item - Individual quality menu item.
   * @return {ConcreteMenuItem} - Menu item
   */
  getQualityMenuItem(item) {
    const player = this.player;

    return new ConcreteMenuItem(player, item, this._qualityButton, this);
  }

  /**
   * Executed when a quality level is added from HLS playlist.
   */
  onAddQualityLevel() {
    const player = this.player;
    const qualityList = player.qualityLevels();
    const levels = qualityList.levels_ || [];
    const levelItems = [];

    for (let i = 0; i < levels.length; ++i) {
      if (
        !levelItems.filter((_existingItem) => {
          return _existingItem.item && _existingItem.item.value === levels[i].height;
        }).length
      ) {
        const levelItem = this.getQualityMenuItem.call(this, {
          label: levels[i].height + 'p',
          value: levels[i].height,
        });

        levelItems.push(levelItem);
      }
    }

    levelItems.sort((current, next) => {
      if (typeof current !== 'object' || typeof next !== 'object') {
        return -1;
      }
      if (current.item.value < next.item.value) {
        return -1;
      }
      if (current.item.value > next.item.value) {
        return 1;
      }
      return 0;
    });

    if (!player.isLivestream) {
      levelItems.push(
        this.getQualityMenuItem.call(this, {
          label: this.resolveOriginalQualityLabel(false, true),
          value: 'original',
          selected: false,
        })
      );
    }

    levelItems.push(
      this.getQualityMenuItem.call(this, {
        label: __('Auto --[Video quality. Short form]--'),
        value: 'auto',
        selected: true,
      })
    );

    if (this._qualityButton) {
      this._qualityButton.createItems = function () {
        return levelItems;
      };
      this._qualityButton.update();
    }
  }

  swapSrcTo(mode = 'original') {
    const currentTime = this.player.currentTime();
    this.player.src(mode === 'vhs' ? this.player.claimSrcVhs : this.player.claimSrcOriginal);
    this.player.load();
    this.player.currentTime(currentTime);

    console.assert(mode === 'vhs' || mode === 'original', 'Unexpected input');
  }

  /**
   * Sets quality (based on media height)
   *
   * @param {number} height - A number representing HLS playlist.
   */
  setQuality(height) {
    const qualityList = this.player.qualityLevels();

    // Set quality on plugin
    this._currentQuality = height;

    if (this.config.displayCurrentQuality) {
      this.setButtonInnerText(height === 'auto' ? 'auto' : height === 'original' ? 'original' : `${height}p`);
    }

    for (let i = 0; i < qualityList.length; ++i) {
      const quality = qualityList[i];
      quality.enabled = quality.height === height || height === 'auto' || height === 'original';
    }

    if (height === 'original') {
      if (this.player.currentSrc() !== this.player.claimSrcOriginal.src) {
        setTimeout(() => this.swapSrcTo('original'));
      }
    } else {
      if (!this.player.isLivestream && this.player.currentSrc() !== this.player.claimSrcVhs.src) {
        setTimeout(() => this.swapSrcTo('vhs'));

        if (height !== 'auto') {
          // -- Re-select quality --
          // Until we have "persistent quality" implemented, we need to do this
          // because the VHS internals default to "auto" when initialized,
          // causing a GUI mismatch.
          setTimeout(() => this.setQuality(height), 1000);
        }
      }
    }

    this._qualityButton.unpressButton();
  }

  /**
   * Return the current set quality or 'auto'
   *
   * @return {string} the currently set quality
   */
  getCurrentQuality() {
    return this._currentQuality || 'auto';
  }
}

/**
 * Function to invoke when the player is ready.
 *
 * This is a great place for your plugin to initialize itself. When this
 * function is called, the player will have its DOM and child components
 * in place.
 *
 * @function onPlayerReady
 * @param    {Player} player
 *           A Video.js player object.
 *
 * @param    {Object} [options={}]
 *           A plain object containing options for the plugin.
 */
const onPlayerReady = (player, options) => {
  player.addClass('vjs-hls-quality-selector');
  player.hlsQualitySelector = new HlsQualitySelectorPlugin(player, options);
};

/**
 * A video.js plugin.
 *
 * In the plugin function, the value of `this` is a video.js `Player`
 * instance. You cannot rely on the player being in a "ready" state here,
 * depending on how the plugin is invoked. This may or may not be important
 * to you; if not, remove the wait for "ready"!
 *
 * @function hlsQualitySelector
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
const hlsQualitySelector = function (options) {
  this.ready(() => {
    onPlayerReady(this, videojs.mergeOptions(defaults, options));
  });
};

// Register the plugin with video.js.
registerPlugin('hlsQualitySelector', hlsQualitySelector);

// Include the version number.
hlsQualitySelector.VERSION = VERSION;

export default hlsQualitySelector;
/* eslint-enable */
