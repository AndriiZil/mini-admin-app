### How to setup project and install dependencies

* First of all you need to install node.js on your computer.
* After that you need to install node_modules.
```
npm i
```
* If you don't have an npm please install it.
* To correct work with API install dev documentation
```
npm run apidoc
```
* Run project type:
```$xslt
npm run server
```
* Run project in dev mode (with nodemon) type:
```$xslt
npm run server-dev
```
* Add credentials to ./routes/services/notification-mail-service
```angular2
{
    user: 'email',
    pass: 'password'
}
```

* Change url for your host url in notification-mail-service
* Change field "from" in every of methods
