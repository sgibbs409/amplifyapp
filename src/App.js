import React, { useState, useEffect } from 'react';
import './App.css';
import { API, Storage } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';

const initialFormState = { name: '', description: ''};

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  // Fetch notes once upon (first) mounting
  useEffect(() => {
    fetchNotes();
  }, []);

  // Called when choose-image button returns changed file list
  // Note: automatically uploads selected image to database
  async function onChange(e) {
    if (!e.target.files[0]) return
    const file = e.target.files[0];
    // console.log("File.name: ", file.name);

    // new note's note.image will get just the filename
    setFormData({ ...formData, image: file.name });

    // Push selected image to aws S3 bucket.
    // Maps the filename to the stored image data (the actual file)
    await Storage.put(file.name, file);

    // fetchNotes();
  }

  // Asynchronously update state.notes
  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;

    // Replace note.image (if set) with image's S3 URL
    // (Otherwise query returns note.image with just image's name, not full URL)
    await Promise.all(notesFromAPI.map(async note => {

      // console.log("note: ", note);
      if (note.image) { //assert: note.image is image name
        const image = await Storage.get(note.image);
        note.image = image; // assert: note.image is now image's S3 URL
      }
      return note;
    }));

    setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    // <name> and <description> are required fields
    if (!formData.name || !formData.description) return;

    // Push new note to aws database
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });

    // // If image set, attach its S3 url to formData.image
    // if (formData.image) {
    //   const image = await Storage.get(formData.image);
    //   formData.image = image;
    // }

    // // Update UI: append new note to state.notes 
    // setNotes([...notes, formData]);

    // Reset form
    setFormData(initialFormState);

    //Update UI with latest note list
    fetchNotes();
  }

  async function deleteNote({ id }) {
    //update UI
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);

    // Update database
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } } });
  }

  return (
    <div className="App">
      <h1>My Notes App</h1>
      <input
        onChange={e => setFormData({ ...formData, 'name': e.target.value })}
        placeholder="Note name"
        value={formData.name}
      />
      <input
        onChange={e => setFormData({ ...formData, 'description': e.target.value })}
        placeholder="Note description"
        value={formData.description}
      />
      <input
        type="file"
        onChange={onChange}
      />
      <button onClick={createNote}>Create Note</button>
      <div style={{ marginBottom: 30 }}>
        {
          notes.map(note => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              <button onClick={() => deleteNote(note)}>Delete note</button>
              {
                note.image && <img src={note.image} style={{ width: 400 }} alt={"Note Pic"} />
              }
            </div>
          ))
        }
      </div>
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);


// import React from 'react';
// import logo from './logo.svg';
// import './App.css';
// import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react'

// function App() {
//   return (
//     <div className="App">
//       <header>
//         <img src={logo} className="App-logo" alt="logo" />
//         <h1>We now have Auth!</h1>
//       </header>
//       <AmplifySignOut />
//     </div>
//   );
// }

// export default withAuthenticator(App);


// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <h1>Hello from V2</h1>
//       </header>
//     </div>
//   );
// }

// export default App;
