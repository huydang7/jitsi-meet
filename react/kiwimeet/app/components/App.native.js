/* eslint-disable react/jsx-no-bind */
// @flow

import { jitsiLocalStorage } from '@jitsi/js-utils';
import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import { Provider } from 'react-redux';
import { compose, createStore } from 'redux';
import Thunk from 'redux-thunk';

import logger from '../../../features/app/logger';
import { appWillMount, appWillUnmount } from '../../../features/base/app/actions';
import { Platform } from '../../../features/base/react';
import {
    MiddlewareRegistry,
    PersistenceRegistry,
    ReducerRegistry,
    StateListenerRegistry
} from '../../../features/base/redux';
import { DimensionsDetector, clientResized } from '../../../features/base/responsive-ui';

import '../../../features/app/middlewares';
import '../../../features/app/reducers';


declare var __DEV__;


/**
 * Handles a (possibly unhandled) JavaScript error by preventing React Native
 * from converting a fatal error into an unhandled native exception which will
 * kill the app.
 *
 * @param {Error} error - The (possibly unhandled) JavaScript error to handle.
 * @param {boolean} fatal - If the specified error is fatal, {@code true};
 * otherwise, {@code false}.
 * @private
 * @returns {void}
 */
function _handleException(error, fatal) {
    if (fatal) {
        // In the Release configuration, React Native will (intentionally) throw
        // an unhandled JavascriptException for an unhandled JavaScript error.
        // This will effectively kill the app. In accord with the Web, do not
        // kill the app.
        logger.error(error);
    } else {
        // Forward to the next globalHandler of ErrorUtils.
        const { next } = _handleException;

        typeof next === 'function' && next(error, fatal);
    }
}

const App = () => {

    const [ store, setStore ] = useState(null);


    const _maybeDisableExceptionsManager = () => {
        if (__DEV__) {
            // As mentioned above, only the Release configuration was observed
            // to suffer.
            return;
        }
        if (Platform.OS !== 'android') {
            // A solution based on RTCSetFatalHandler was implemented on iOS and
            // it is preferred because it is at a later step of the
            // error/exception handling and it is specific to fatal
            // errors/exceptions which were observed to kill the app. The
            // solution implemented below was tested on Android only so it is
            // considered safest to use it there only.
            return;
        }

        const oldHandler = global.ErrorUtils.getGlobalHandler();
        const newHandler = _handleException;

        if (!oldHandler || oldHandler !== newHandler) {
            newHandler.next = oldHandler;
            global.ErrorUtils.setGlobalHandler(newHandler);
        }
    };

    const _initStorage = async () => {
        const _initializing = jitsiLocalStorage.getItem('_initializing');

        return _initializing || Promise.resolve();
    };

    const _createStore = () => {
        const reducer = ReducerRegistry.combineReducers();


        const middleware = MiddlewareRegistry.applyMiddleware(Thunk);
        const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
        const _store = createStore(reducer, PersistenceRegistry.getPersistedState(), composeEnhancers(middleware));

        StateListenerRegistry.subscribe(_store);
        setStore(_store);
    };

    const init = async () => {


        try {
            await _initStorage();
            _createStore();

        } catch (err) {
            /* BaseApp should always initialize! */
            logger.error(err);
        }
        if (store) {

            store.dispatch(appWillMount());

        }


    };


    useEffect(() => {
        SplashScreen.hide();
        _maybeDisableExceptionsManager();

        init();

        return () => {
            if (store) {
                store.dispatch(appWillUnmount());
            }
        };
    }, [ ]);


    const _onDimensionsChanged = (width: number, height: number) => {
        if (store) {
            const { dispatch } = store;

            dispatch(clientResized(width, height));
        }
    };

    if (store) {


        return (

            <Provider

                store = { store }>
                <DimensionsDetector onDimensionsChanged = { _onDimensionsChanged } >

                    <View
                        style = {{ flex: 1,
                            width: 500,
                            height: 300,
                            backgroundColor: 'white' }} />

                </DimensionsDetector>

            </Provider>
        );
    }

    return <></>;
}
  ;

export { App };
