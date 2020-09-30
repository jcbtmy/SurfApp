import React from 'react';
import Select from 'react-select';
import CanvasJSReact from './canvasjs.react';
import './App.css';
import { Map, Marker, Popup, TileLayer } from 'react-leaflet';
//import {GoogleApiWrapper} from 'google-maps-react';
//export class MapContainer extends React.Component{
function Loading() {
	return "Loading.....";
}

class SurfMap extends React.Component{

	markerClick = (event) => {

			let m_latlng = event.latlng;
			let marker_coordinates = JSON.stringify([m_latlng.lat, m_latlng.lng]);
			let stations = this.props.stations;

			for(let i=0; i < stations.length; i++){

				if( marker_coordinates === JSON.stringify(stations[i].coordinates)){

					this.props.clickEvent(stations[i]);
				}
			}
	}

	displayMarkers(){

		const markers = this.props.stations.map((station) => { 

					return (<Marker key={station.value}

									position={station.coordinates}

									onMouseOver={ (e) => {
										e.target.openPopup();
									}}

									onMouseOut={ (e) => {
										e.target.closePopup();	
									}}

									onClick={
										this.markerClick
									}
							>

							<Popup>{station.label}</Popup>

							</Marker>

								);


				});

		return markers;


	}
	
	render(){

		return (
			<div className="Map">
				<Map center={this.props.currentStation.coordinates} zoom={11}>
				  <TileLayer
        					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        					attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
     			  />

     			  {this.displayMarkers()}


				</Map>
			</div>
		);
	}
}


class SurfText extends React.Component{

	celciusToFahrenheit(celcius){

		let c_float = parseFloat(celcius);
		let f_float = Math.floor(( c_float * 9/5 ) + 32.0);

		return f_float.toString();

	}

	metersToFeet(meters){

		let m_float = parseFloat(meters);
		let f_float = m_float * 3.28084;
		f_float = f_float.toFixed(2);

		return f_float;

	}

	displayTemps(){
		
		const stationTemps = this.props.stationTemps;
		const f_degree = '\u2109';

		let temperature_display = [];

		if(!stationTemps){
			return;
		}

		if(stationTemps.WTMP !== "MM"){
			temperature_display.push(<p key="WTMP">Water Temperature: {this.celciusToFahrenheit(stationTemps.WTMP)}{f_degree}</p>);
		}

		if(stationTemps.ATMP !== "MM"){
			temperature_display.push(<p key="ATMP">Air Temperature: {this.celciusToFahrenheit(stationTemps.ATMP)}{f_degree}</p>);
		}

		return temperature_display;
	}

	displayGraph(){

		var CanvasJSChart = CanvasJSReact.CanvasJSChart;

		const waves = this.props.stationWaves.map( (t) => {return {x: t.time, y: parseFloat(this.metersToFeet(t.WVHT))};});
		const wave_list = waves.map(t => t.y);
		const wave_max = Math.max(...wave_list);
		const wave_min = Math.min(...wave_list);
		const fluff = Math.abs(wave_max - wave_min) * 0.1;


		const options = {

			axisY:{
				maximum: wave_max + fluff,
				minimum: wave_min - fluff,
			},

			height: 160,

			data :[{
				type: "splineArea", 
				name: "Wave Height",
				connectNullData: true,
				xValueType:"dateTime",
				xValueFormatString: "D MMM h:mm TT ",
				dataPoints: waves
			}]

		};

		return(
			<div className="Chart">
				<CanvasJSChart options={options} />
			</div>
			);
	}

	
	render(){

		
		const waves = this.props.stationWaves;
		const last_wave_height = waves[waves.length - 1].WVHT;

		return (
			
			<div className="SurfText">
				<h2><b>{this.props.stationName}</b></h2>
				<h2><b>Wave Height: {this.metersToFeet(last_wave_height).toString()} ft</b></h2>
				{this.displayTemps()}
				{this.displayGraph()}
			</div>
		
		);
	}
}


class SurfApp extends React.Component{
	
	constructor(props){
	
		super(props);
		this.state = {

			error: null,
			isLoaded: false,
			selectedStation: null,
			tempData: null,
			specData: null,
			stations: null,
			notAvailable: false,

			};
	
		this.damnStation = "LJAC1"; //seperate id for station reporting la jolla's temperature data
		
		this.ndbc_cors = "https://cors-anywhere.herokuapp.com/https://www.ndbc.noaa.gov/";

	}
	
	componentDidMount(){
	
		this.getActiveStations().then((result) => {this.setState({isLoaded: true, stations: result});});	
	}

	async checkforSpecData(station_id){

		const ndbc_select_spec = this.ndbc_cors.concat("data/realtime2/", station_id, ".spec");
		const res = await fetch(ndbc_select_spec);
		return (res.status === 200) ? await res.text() : false;
	}

	async getWeatherData(station_id){

		station_id = (station_id !== "LJPC1") ? station_id : "LJAC1";

		const ndbc_select_spec = this.ndbc_cors.concat("data/realtime2/", station_id, ".txt");
		const res = await fetch(ndbc_select_spec);

		return (res.status === 200) ? await res.text() : false;
	}

	async getActiveStations(){

		const xml_header = {'Content-Type':'text/xml'};

		const result = await fetch("http://localhost:3000/stationList.xml", {headers: xml_header} );
		const res = await result.text();
		const xmlDoc = new DOMParser().parseFromString(res, "text/xml");
		const stations = xmlDoc.getElementsByTagName("station");


		return this.parseActiveStationsXml(stations);
	}
	
	parseActiveStationsXml(stations){

		let stationsLen = stations.length;
		let station_list = [];

		let name;
		let station_id;
		let lat;
		let lon;

		
		for(var i = 0; i < stationsLen ; i++){
		
				name = stations[i].getAttribute("name").split("-").pop();
				station_id = stations[i].getAttribute("id").toUpperCase();
				lat = parseFloat(stations[i].getAttribute("lat"));
				lon = parseFloat(stations[i].getAttribute("lon"));

				station_list.push({ value: station_id,  label: name, coordinates: [lat, lon]});
				
		}

		return station_list;
	}


	handleSelectStation = (stationSelect) => {

		this.setState({isLoaded: false, notAvailable: false});	
		

		this.checkforSpecData(stationSelect.value).then((result) => {

					if(!result){
						this.setState({notAvailable: true});
						return;
					}

					this.setState({selectedStation: stationSelect, specData: this.parseSpectralData(result) , isLoaded:true });

				})
			.catch( (error) => {
					this.setState({error});

				});

		this.getWeatherData(stationSelect.value).then((result) => {

					this.setState({tempData: this.parseWeatherData(result), isLoaded:true});

				})
			.catch((error) =>{
					this.setState({error});
			});
	}

	parseSpectralData(data){

		const twoDaysAgo = new Date();
		const twoDays = (24*60*60*1000) * 2;
		const rows = data.split("\n");

		let spec_object = [];
		let row_len;

		row_len = rows.length;

		twoDaysAgo.setTime(twoDaysAgo.getTime() - twoDays);

		for(let i = 2; i < row_len - 1; i++){	

			let cols = rows[i].match(/\S+/g);

			//row_date gets year,month,day,hr,min from columns
			let year = parseInt(cols[0]);
			let month = parseInt(cols[1]) - 1 ;
			let day = parseInt(cols[2]);
			let hour = parseInt(cols[3]);
			let min = parseInt(cols[4]);


			let row_date = new Date(Date.UTC(year, month , day, hour, min));

			if(row_date < twoDaysAgo){
				break;
			}

			spec_object.unshift({time: row_date, WVHT: cols[5], steepness: cols[12]});


		}

		return spec_object;


	}

	parseWeatherData(data){

		const rows = data.split("\n");
		let cols = rows[2].match(/\S+/g);

		return { ATMP: cols[13], WTMP: cols[14]};
	}

	notAvailable(){
		return <h1>Station data not available</h1>
	}


	
	render(){
	
		const {	error, 
				isLoaded, 
				selectedStation, 
				stations,
				tempData,
				specData ,
				notAvailable   } = this.state;


			
		return (
			<div className="SurfApp">
			
			{error && error.message}
			
			{ /*If isLoaded is true then render select component else render Loading*/}
			
			{ !isLoaded && <Loading />}
			 
			{ isLoaded &&

				  <Select
				 	value={selectedStation}
				 	onChange={this.handleSelectStation}
				 	options={stations}
				 />
			}

			{	
				notAvailable && this.notAvailable()
			}

			{ selectedStation	&&

				<SurfMap
					currentStation={selectedStation}
					stations={stations}
					clickEvent={this.handleSelectStation}
				/>

			}


			{ selectedStation && 
				<SurfText 
					stationName={selectedStation.label}
					stationWaves={specData}
					stationTemps={tempData}
				/>
			}

				 
					
			</div>
		);	
	}

}

class Page extends React.Component{
	

	render(){
		return (
			<div className="Page">
		 	   <SurfApp />
			</div>
		); 
	}
}


export default Page;
