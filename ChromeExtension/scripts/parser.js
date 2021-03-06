/**
* Genie metadata tokenizer and parser
*/
"use strict";
var $genie = $genie || {};
(function ($genie) {
    class Parser {
        constructor() {
            this.dictionary = new Typo("en_US");
            this.posTagger = new POSTagger();
            this.tokens = [];
        }

        // Split the string by camel casing
        splitCamelCase(stringToSplit) {
            // Check for camel casing
            var camelCasedTokens = stringToSplit.replace(/([a-z](?=[A-Z]))/g, '$1 ');
            var splitString = camelCasedTokens.split(' ');
            if (splitString.length > 1) {
                return splitString;
            }
        };

        splitCamelCaseNonEnglish(stringToSplit) {
            var camelCasedTokens = stringToSplit.replace(/([A-Z](?=[a-z]))/g, '$1 ');
            var splitString = camelCasedTokens.split(' ');
            if (splitString.length > 1) {
                return splitString;
            } else {
                camelCasedTokens = stringToSplit.replace(/([a-z](?=[A-Z]))/g, '$1 ');
                splitString = camelCasedTokens.split(' ');
                if (splitString.length > 1) {
                    return splitString;
                }
            }
        }

        // Split the string by dashes "-"
        splitDashed(stringToSplit) {
            var dashedString = stringToSplit.split('-');
            if (dashedString.length > 1) {
                return dashedString;
            }
        };

        // Split the string by the underscore "_"
        splitUnderscored(stringToSplit) {
            var underscoreString = stringToSplit.split('_');
            if (underscoreString.length > 1) {
                return underscoreString;
            }
        };

        // Split the string by a double dash "--"
        splitDoubleDashed(stringToSplit) {
            var doubleDashedString = stringToSplit.split('--');
            if (doubleDashedString.length > 1) {
                return doubleDashedString;
            }
        };

        // Split the string by spaces " "
        splitSpace(stringToSplit) {
            var spacedString = stringToSplit.split(' ');
            if (spacedString.length > 1) {
                return spacedString;
            }
        };

        splitDoubleUnderscore(stringToSplit) {
            var doubleUnderscore = stringToSplit.split('__');
            if (doubleUnderscore.length > 1) {
                return doubleUnderscore;
            }
        };

        splitNumbers(stringToSplit) {
            var numbers = stringToSplit.replace(/([a-z](?=[0-9]))/g, '$1 ');
            var splitString = numbers.split(' ');
            if (splitString.length > 1) {
                return splitString;
            }
        };

        parseString(wordString) {
            // First remove & and replace with 'and'
            wordString = wordString.replace("&", "and");

            // TODO: See if lodash _.words could be used instead. 
            // Things that don't work
            // Classes with numbers in them
            // no camel casing is used to separate the words
            // First remove all numbers from the string
            // This code structure is absolutely ridiculous
            // TODO: REFACTOR ME!!
            var words = [];
            var tokens = this.splitDashed(wordString); // Look for the separator first
            if (!tokens) {
                tokens = this.splitUnderscored(wordString);
                if (!tokens) {
                    tokens = this.splitDoubleUnderscore(wordString);
                    if (!tokens) {
                        tokens = this.splitDoubleDashed(wordString);
                        if (!tokens) {
                            tokens = this.splitSpace(wordString);
                            if (!tokens) {
                                tokens = this.splitNumbers(wordString);
                            }
                        }
                    }
                }
            }

            if (tokens && tokens.length > 0) {
                for (var i = 0; i < tokens.length; i++) {
                    var token = tokens[i];
                    var camelCase = this.splitCamelCase(token);
                    if (camelCase && camelCase.length > 0) {
                        words = words.concat(camelCase);
                    } else {
                        words.push(token);
                    }
                }
            } else {
                // Attempt to split by camel casing if there were no separators
                var camelCase = this.splitCamelCase(wordString);
                if (camelCase && camelCase.length > 0) {
                    words = words.concat(camelCase);
                } else {
                    words.push(wordString);
                }
            }
            return words;
        };

        /**
         * sorts a list of words by their English parts of speech 
         */
        normalizeAndTagPOS(words) {
            var partsOfSpeech = {};
            partsOfSpeech.nouns = [];
            partsOfSpeech.verbs = [];
            partsOfSpeech.other = [];
            partsOfSpeech.numbers = [];
            partsOfSpeech.nonEnglish = [];

            for (var i = 0; i < words.length; i++) {
                var word = words[i].toLowerCase();
                // convert the word to lowercase before further processing
                if (word.length > 0) {
                    if (this.isEnglish(word)) {
                        var pos = this.partOfSpeech(word);
                        var posValue = pos[0][1];
                        this.savePartOfSpeech(word, posValue, partsOfSpeech);
                    } else {
                        // Try to parse them by camel casing & re-tag
                        var splitCamelCase = this.splitCamelCaseNonEnglish(word);
                        if (splitCamelCase && splitCamelCase.length > 1) {
                            var newPos, newPosValue;
                            if (this.isEnglish(splitCamelCase[1])) {
                                newPos = this.partOfSpeech(splitCamelCase[1]);
                                newPosValue = newPos[0][1];
                                this.savePartOfSpeech(splitCamelCase[1], newPosValue, partsOfSpeech);
                            } else {
                                partsOfSpeech.nonEnglish.push(splitCamelCase[1]);
                            }

                            if (this.isEnglish(splitCamelCase[0])) {
                                newPos = this.partOfSpeech(splitCamelCase[0]);
                                newPosValue = newPos[0][1];
                                this.savePartOfSpeech(splitCamelCase[0], newPosValue, partsOfSpeech);
                            } else {
                                partsOfSpeech.nonEnglish.push(splitCamelCase[0]);
                            }
                        } else {
                            // try to convert it into a number
                            var value = parseInt(word);
                            if (!isNaN(value)) {
                                partsOfSpeech.numbers.push(value);
                            } else {
                                partsOfSpeech.nonEnglish.push(word);
                            }
                        }
                    }
                }
            }
            return partsOfSpeech;
        };

        savePartOfSpeech(word, posValue, partsOfSpeech) {
            if (["NN", "NNP", "NNPS", "NNS"].indexOf(posValue) > -1) {
                partsOfSpeech.nouns.push(word.toLowerCase());
            } else if (["VB", "VBP"].indexOf(posValue) > -1) {
                partsOfSpeech.verbs.push(word.toLowerCase());
            } else {
                partsOfSpeech.other.push(word.toLowerCase());
            }
        }

        /**
         * Assume English if spelled correctly in English dictionary
         */
        isEnglish(word) {
            var is_spelled_correctly = this.dictionary.check(word);
            return is_spelled_correctly && word.length > 1;
        };

        // Tag the part of speech 
        partOfSpeech(word) {
            // Words should be an array
            // TODO: make sure this is not too slow
            var words = [];
            words.push(word);
            var taggedWords = this.posTagger.tag(words);
            return taggedWords;
        };

        // Parse a string into tokens, find English words, and tag parts of speechs
        parse(tokenString) {
            var words = [];
            if (tokenString) {
                var parsedWords = this.parseString(tokenString);
                if (parsedWords && parsedWords.length > 0) {
                    words = words.concat(parsedWords);
                }
            }

            // Return a collection of english and non-english words
            return this.normalizeAndTagPOS(words);
        };

        split(tokenString) {
            // Return the string split by teoksn
            if (tokenString) {
                return this.parseString(tokenString);
            }
        }
    };

    $genie.Parser = Parser;
})($genie);