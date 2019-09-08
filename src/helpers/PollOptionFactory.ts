import { PollOption } from "../models/PollOption";
import { GoogleMapsClient } from "@google/maps";

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

                    const optionName = places[randomIndex].name;
                    const optionDesc = places[randomIndex].formatted_address;
        
                    const option = new PollOption(optionName, optionDesc);
                    options.push(option);

                    places.splice(randomIndex, 1);
                }          
            }
        } catch (error) {
            console.error(error);
        }

        return options;
    }
    
}

export interface PollOptionFactory {

    build(numberOfOptions?: number) : Promise<PollOption[]>

}