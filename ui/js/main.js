import React from 'react';
import ReactDOM from 'react-dom';
import lbry from './lbry.js';
import lbryio from './lbryio.js';
import lighthouse from './lighthouse.js';
import App from 'component/app/index.js';
import SplashScreen from 'component/splash.js';
import SnackBar from 'component/snackBar';
import {AuthOverlay} from 'component/auth.js';
import { Provider } from 'react-redux';
import batchActions from 'util/batchActions'
import store from 'store.js';
import {
  doChangePath,
  doNavigate,
  doDaemonReady,
  doHistoryPush
} from 'actions/app'
import {
  doFetchDaemonSettings
} from 'actions/settings'
import {
  doFileList
} from 'actions/file_info'
import parseQueryParams from 'util/query_params'

const {remote, ipcRenderer, shell} = require('electron');
const contextMenu = remote.require('./menu/context-menu');
const app = require('./app')

lbry.showMenuIfNeeded();

window.addEventListener('contextmenu', (event) => {
  contextMenu.showContextMenu(remote.getCurrentWindow(), event.x, event.y,
                              lbry.getClientSetting('showDeveloperMenu'));
  event.preventDefault();
});

window.addEventListener('popstate', (event, param) => {
  const queryString = document.location.search
  const pathParts = document.location.pathname.split('/')
  const route = '/' + pathParts[pathParts.length - 1]

  let action
  if (route.match(/html$/)) {
    action = doChangePath('/discover')
  } else {
    action = doChangePath(`${route}${queryString}`)
  }

  app.store.dispatch(action)
})

ipcRenderer.on('open-uri-requested', (event, uri) => {
  console.log(event)
  console.log(uri)
  if (uri && uri.startsWith('lbry://')) {
    console.log(uri)
    doNavigate('/show', { uri })
  }
});

document.addEventListener('click', (event) => {
  var target = event.target;
  while (target && target !== document) {
    if (target.matches('a[href^="http"]')) {
      event.preventDefault();
      shell.openExternal(target.href);
      return;
    }
    target = target.parentNode;
  }
});

const initialState = app.store.getState();

var init = function() {

  function onDaemonReady() {
    window.sessionStorage.setItem('loaded', 'y'); //once we've made it here once per session, we don't need to show splash again
    const actions = []

    actions.push(doDaemonReady())
    actions.push(doChangePath('/discover'))
    actions.push(doFetchDaemonSettings())
    actions.push(doFileList())

    app.store.dispatch(batchActions(actions))

    ReactDOM.render(<Provider store={store}><div>{ lbryio.enabled ? <AuthOverlay/> : '' }<App /><SnackBar /></div></Provider>, canvas)
  }

  if (window.sessionStorage.getItem('loaded') == 'y') {
    onDaemonReady();
  } else {
    ReactDOM.render(<SplashScreen message="Connecting" onLoadDone={onDaemonReady} />, canvas);
  }
};

init();
