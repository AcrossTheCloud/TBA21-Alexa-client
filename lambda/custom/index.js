/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  no-use-before-define */


// City Guide: A sample Alexa Skill Lambda function
//  This function shows how you can manage data in objects and arrays,
//   choose a random recommendation,
//   call an external API and speak the result,
//   handle YES/NO intents with session attributes,
//   and return text data on a card.

const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const axios = require('axios');
const aws4 = require('aws4');

// 1. Handlers ===================================================================================

const LaunchHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const responseBuilder = handlerInput.responseBuilder;

        const requestAttributes = attributesManager.getRequestAttributes();
        const speechOutput = `${requestAttributes.t('WELCOME')} ${requestAttributes.t('HELP')}`;
        return responseBuilder
            .speak(speechOutput)
            .reprompt(speechOutput)
            .getResponse();
    },
};

const AboutHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'AboutIntent';
    },
    handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const responseBuilder = handlerInput.responseBuilder;

        const requestAttributes = attributesManager.getRequestAttributes();

        return responseBuilder
            .speak(requestAttributes.t('ABOUT'))
            .getResponse();
    },
};


const ItemsHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'ItemsIntent';
    },
    handle: async (handlerInput) => {
        console.log('running items handler');
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;

        let term = '';
        if (request.intent.slots.keyword.value && request.intent.slots.keyword.value !== "?") {
            term = request.intent.slots.keyword.value;
        }
        console.log('searching for ' + term);

        const APIrequest = {
          host: 'aj0srw8hq2.execute-api.eu-central-1.amazonaws.com',
          method: 'GET',
          url: 'https://aj0srw8hq2.execute-api.eu-central-1.amazonaws.com/prod/items',
          path: '/prod/items',
          headers: {
            'Content-Type': 'application/json'
          }
        }

        let signedRequest = aws4.sign(APIrequest);

        delete signedRequest.headers['Host'];
        delete signedRequest.headers['Content-Length'];


        let response = await axios(signedRequest);
        let result = response.data.Items.filter(
              item => {
                if (item.ocean.toLowerCase().includes(term.toLowerCase())) {
                  return true;
                } else if (item.description.toLowerCase().includes(term.toLowerCase())) {
                  return true;
                } else if (item.tags.toString().toLowerCase().includes(term.toLowerCase())) {
                  return true;
                } else if (item.people.map(person => person.personName + person.roles.toString()).toString().toLowerCase().includes(term)) {
                  return true;
                } else {
                  return false;
                }
              }
            );
        let speechOutput = '';

        if (result.length===0) {
          speechOutput = 'Sorry, no matching items found.';
        } else {
          speechOutput = 'I found these matching items. ';
          for (let idx = 0; idx < result.length; idx++) {
            let audio = '';
            for (let url of result[idx].urls) {
              if (url.toLowerCase().endsWith('.mp3') && url.toLowerCase().startsWith('https')) {
                audio = encodeURI(url);
              }
            }
            if (audio) {
              speechOutput += `Item ${idx+1} is ${result[idx].description} located in the ${result[idx].ocean} ocean, tagged with ${result[idx].tags}. I'll now play you the audio. <audio src="${audio}" /> `;
            } else {
              speechOutput += `Item ${idx+1} is ${result[idx].description} located in the ${result[idx].ocean} ocean, tagged with ${result[idx].tags}. `;
            }
          }
        }
        return responseBuilder.speak(speechOutput).getResponse();
    }
};

const HelpHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const responseBuilder = handlerInput.responseBuilder;

        const requestAttributes = attributesManager.getRequestAttributes();
        return responseBuilder
            .speak(requestAttributes.t('HELP'))
            .reprompt(requestAttributes.t('HELP'))
            .getResponse();
    },
};

const StopHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest'
            && (request.intent.name === 'AMAZON.NoIntent'
            || request.intent.name === 'AMAZON.CancelIntent'
            || request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const responseBuilder = handlerInput.responseBuilder;

        const requestAttributes = attributesManager.getRequestAttributes();
        return responseBuilder
            .speak(requestAttributes.t('STOP'))
            .getResponse();
    },
};

const SessionEndedHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const request = handlerInput.requestEnvelope.request;

        console.log(`Error handled: ${error.message}`);
        console.log(` Original request was ${JSON.stringify(request, null, 2)}\n`);

        return handlerInput.responseBuilder
            .speak('Sorry, I can\'t understand the command. Please say again.')
            .reprompt('Sorry, I can\'t understand the command. Please say again.')
            .getResponse();
    },
};

const FallbackHandler = {

  // 2018-May-01: AMAZON.FallackIntent is only currently available in en-US locale.

  //              This handler will not be triggered except in that locale, so it can be

  //              safely deployed for any locale.

  canHandle(handlerInput) {

    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'

      && request.intent.name === 'AMAZON.FallbackIntent';

  },

  handle(handlerInput) {

    return handlerInput.responseBuilder

      .speak(FALLBACK_MESSAGE)

      .reprompt(FALLBACK_REPROMPT)

      .getResponse();

  },

};


// 2. Constants ==================================================================================

const languageStrings = {
    en: {
        translation: {
            WELCOME: 'Welcome to the Ocean Archive!',
            HELP: 'Ask Alexa about the ocean archive, or say Alexa ask ocean archive to search items for keyword.',
            ABOUT: 'The Ocean Archive is an archive of ocean artefacts developed by the TBA21 Academy in collaboration with USER Group and Across the Cloud.',
            STOP: 'Okay, see you next time!',
        },
    }
};

const SKILL_NAME = 'archive';
const FALLBACK_MESSAGE = `The ${SKILL_NAME} can\'t help you with that.  You can ask me to search for items in the archive. What can I help you with?`;
const FALLBACK_REPROMPT = 'What can I help you with?';


// 3. Helper Functions ==========================================================================


const LocalizationInterceptor = {
    process(handlerInput) {
        const localizationClient = i18n.use(sprintf).init({
            lng: handlerInput.requestEnvelope.request.locale,
            overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
            resources: languageStrings,
            returnObjects: true,
        });

        const attributes = handlerInput.attributesManager.getRequestAttributes();
        attributes.t = function (...args) {
            return localizationClient.t(...args);
        };
    },
};

// 4. Export =====================================================================================

const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchHandler,
        AboutHandler,
        ItemsHandler,
        HelpHandler,
        StopHandler,
        FallbackHandler,
        SessionEndedHandler
    )
    .addRequestInterceptors(LocalizationInterceptor)
    .addErrorHandlers(ErrorHandler)
    .lambda();
