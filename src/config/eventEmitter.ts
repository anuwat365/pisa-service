// Import the built-in EventEmitter class from the 'events' module
import EventEmitter from "events";

// Create a single instance of EventEmitter to be used throughout the app
const events = new EventEmitter();

// Export the EventEmitter instance as the default export
export default events;
