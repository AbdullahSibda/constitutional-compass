# constitutional-compass

1. ensure that all pushes are to "dev" branch and not "main" to ensure tests are ran and passed before merging.
2. when you clone the repo, you need to install node(version 22), babel and jest(for testing):
      2.1 npm install react@latest react-dom@latest @testing-library/react@latest
      2.2 npm install --save-dev @babel/preset-env @babel/preset-react babel-jest
      2.3 npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
      2.4 npm install --save-dev @testing-library/react@14 jest@29 babel-jest@29 @babel/preset-react@7
      2.5 npm install
4. add all tests to the tests folder in src
5. run tests locally using "npm test" before pushing to dev branch
6. make sure there are no divs in your code!!!
7. if you are not sure about something, ask on the group first
