import { PollOption } from "../models/PollOption";
import { GoogleMapsClient, PlaceSearchResult } from "@google/maps";

export class LivePollOptionFactory implements PollOptionFactory {
    
    private placesProvider: GoogleMapsClient;

    constructor(placesProvider: GoogleMapsClient) {
        this.placesProvider = placesProvider;
    }

    async build(numberOfOptions?: number): Promise<PollOption[]> {
        const options: PollOption[] = [];
        try {    
            const placesResponse = await this.placesProvider.places({
                query: undefined,
                opennow: true,
                location: [51.083986, -114.130609],  //VMG office,
                radius: 4000,
                type: 'restaurant'
            }).asPromise();
            
            if (placesResponse.status === 200 && placesResponse.json.status === 'OK') {
                let places = [];

                places.push(...placesResponse.json.results);
                
                if (placesResponse.json.next_page_token) {

                    //Need to sleep for a couple of seconds because the page token is not ready...
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const morePlacesResponse = await this.placesProvider.places({
                        query: undefined,
                        pagetoken: placesResponse.json.next_page_token                   
                    }).asPromise();
    
                    if (morePlacesResponse.status === 200 && morePlacesResponse.json.status === 'OK') {
                        places.push(...morePlacesResponse.json.results);
                    }
                }               

                for (let index = 0; index < numberOfOptions; index++) {
                    const randomIndex = Math.floor(Math.random() * places.length);

                    const optionPlaceId = places[randomIndex].place_id;
                    const optionName = places[randomIndex].name;
                    const optionDesc = places[randomIndex].formatted_address;
        
                    const option = new PollOption(optionPlaceId, optionName, optionDesc);
                    options.push(option);

                    places.splice(randomIndex, 1);
                }          
            }
        } catch (error) {
            console.error(error);
        }

        return options;
    }
    
    async buildFromQuery(query: string, numberOfOptions?: number) : Promise<PollOption[]> {       
        try { 
            const places: PlaceSearchResult[] = await this.getPlaces(query);

            return places.slice(0, numberOfOptions)
                          .map(p => {                          
                              return new PollOption(p.place_id, p.name, p.formatted_address);
                          });
        } catch (error) {
            console.error(error);
        }       
    }

    private async getPlaces(query?: string) : Promise<PlaceSearchResult[]> {
        const placesResponse = await this.placesProvider.places({
            query,
            opennow: true,
            location: [51.083986, -114.130609],  //VMG office,
            radius: 4000,
            type: 'restaurant'
        }).asPromise();

        if (placesResponse.status === 200 && placesResponse.json.status === 'OK') {
            let places : PlaceSearchResult[] = [];

            places.push(...placesResponse.json.results);

            if (placesResponse.json.next_page_token) {

                //Need to sleep for a couple of seconds because the page token is not ready...
                await new Promise(resolve => setTimeout(resolve, 2000));

                const morePlacesResponse = await this.placesProvider.places({
                    query: undefined,
                    pagetoken: placesResponse.json.next_page_token                   
                }).asPromise();

                if (morePlacesResponse.status === 200 && morePlacesResponse.json.status === 'OK') {
                    places.push(...morePlacesResponse.json.results);
                }
            }         
            return places;
        }      
        return []
    }

}

export interface PollOptionFactory {

    build(numberOfOptions?: number) : Promise<PollOption[]>

    buildFromQuery(query: string, numberOfOptions?: number) : Promise<PollOption[]>

}