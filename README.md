# abdispatcher

This is an ECMA 2015(Version 6) implementation/modification of Facebook's Flux Dispatcher.

This dispatcher allows for more convenient registration and de-registration of stores/consumers.
 
This dispatcher has several modes of registration:
 
1) The register is the default "facebook way" of registering callbacks within the dispatcher.
 
2) The registerCallback(callback) function which registers a callback with a specific event.

3) The registerArgs(args) function which registers a variable list of tuples representing events and their corresponding handler/callbacks.

It's probably easier to just look at the code at the moment to see how things are done. You will need an ES6 compatible environment to use this Dispatcher class. I recommend [Babel](http://babeljs.io) for a transpiler.
