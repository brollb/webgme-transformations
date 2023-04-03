// This is used by the test/plugins tests
/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

import * as testFixture from "webgme/test/_globals";
//export { testFixture } from 'webgme/test/_globals';
import * as gmeConfig from "../config/index";

// This flag will make sure the config.test.js is being used
// process.env.NODE_ENV = 'test'; // This is set by the require above, overwrite it here.

var WebGME = testFixture.WebGME,
  getGmeConfig = function () {
    "use strict";
    // makes sure that for each request it returns with a unique object and tests will not interfere
    return JSON.parse(JSON.stringify(gmeConfig));
  };

WebGME.addToRequireJsPaths(gmeConfig);

testFixture.getGmeConfig = getGmeConfig;

export default testFixture;
