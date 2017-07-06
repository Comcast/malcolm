Submitting Issues
=================

If you are submitting a bug, please describe the issue clearly and provide as much detail as possible.



Contribution Guidelines
=======================
We love to see contributions to the project and have tried to make it easy to do so. If you would like to contribute code to this project you can do so through GitHub by forking the repository and sending a pull request.

Before Comcast merges your code into the project you must sign the [Comcast Contributor License Agreement (CLA)](https://gist.github.com/ComcastOSS/a7b8933dd8e368535378cda25c92d19a).

If you haven't previously signed a Comcast CLA, you'll automatically be asked to when you open a pull request. Alternatively, we can e-mail you a PDF that you can sign and scan back to us. Please send us an e-mail or create a new GitHub issue to request a PDF version of the CLA.

For more details about contributing to GitHub projects see
http://gun.io/blog/how-to-github-fork-branch-and-pull-request/


Read Before Submitting Pull Requests
------------------------------------
- **Please submit all pull requests to the `develop` branch. Pull requests to the `master` branch will be closed.** 

- Please give your branch an appropriate branch name, related to your bug fix or feature

- Pull requests should be narrowly focused with no more than 3 or 4 logical commits

- When possible, address no more than one issue / implement no more than one feature

- Please update the CHANGELOG.md file as part of your commit(s).

- Please unit test and leave code coverage the same or higher than it was before your changes.

- Please follow the coding style that exists within the code.

- Please update the README.md file if you change the beahvior of the library, whether
  adding new features or changing the behavior of existing behavior.

- Pull requests should be reviewable in the GitHub code review tool

- Pull requests should be linked to any issues they relate to (put the issue number
  at the end of your commit message and/or pull request message)

Expect a thorough review process for any pull requests that add functionality or change the behavior of the library. We encourage you to sketch your approach in writing on a relevant issue (or creating such an issue if needed) before starting to code, in order to save time and frustration all around.



Formatting
----------
The rules are simple: use the same formatting as the rest of the code.

The following is a list of the styles we are strict about:

* Tabs, not spaces
* Three blank lines between functions / sections of code
* Liberal comments explaining "why", non-obvious nuances, etc.



Testing
-------
Tests are written in [Mocha](https://mochajs.org/) and [Chai](http://chaijs.com/), and instrumented by [Istanbul](https://github.com/yahoo/istanbul).

For a pull request to be accepted, it must be fully tested. If you're having trouble writing the tests, feel free to send your pull request and mention you need help testing it.



Code Organization
-----------------
The code you likely want to change is in lib/malcolm-*.js.



Setting Up a Development Environment
------------------------------------
To contribute, fork the library and install dependencies.

```
git clone https://github.com/comcast/malcolm.git
cd malcolm
npm install
git checkout develop  # all branches from develop branch, please!
git checkout -b myFeatureOrBugFixBranch
npm test
```


