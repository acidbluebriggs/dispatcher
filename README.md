# abdispatcher


This dispatcher allows for more convenient registration and de-registration of stores/consumers.
 
This dispatcher has several modes of registration:
 
1) The register is the default "facebook way" of registering callbacks within the dispatcher.
 
2) The registerCallback(callback) function which registers a callback with a specific event.

3) The registerArgs(args) function which registers a variable list of tuples representing events and their corresponding handler/callbacks.
