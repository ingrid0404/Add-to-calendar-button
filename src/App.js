import logo from './logo.svg';
import './App.css';
import { atcb_generate_ical} from './src/generate_ics';

function App() {
  const handleOnClick = () => {
    const data = {name:'Ingrid title', location:'acasa', startDate: '11-03-2024', endDate: '12-03-2024'}
    atcb_generate_ical(data);
  }
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <button onClick={handleOnClick}>Generate iCal</button>
      </header>
    </div>
  );
}

export default App;
