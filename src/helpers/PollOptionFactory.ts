import { PollOption } from "../models/PollOption";
import { Client, Place, Status } from "@googlemaps/google-maps-services-js";

export class LivePollOptionFactory implements PollOptionFactory {
    
    private placesProvider: Client;

    constructor(placesProvider: Client) {
        this.placesProvider = placesProvider;
    }

    async build(numberOfOptions?: number, keyword?: string): Promise<PollOption[]> {
        const options: PollOption[] = [];
        try {    
            const placesResponse = await this.placesProvider.placesNearby({
                params: {
                    keyword: keyword,
                    opennow: true,
                    location: [51.083986, -114.130609],  //VMG office,
                    radius: 4000,
                    type: 'restaurant',
                    key: process.env.MAPS_API_KEY
                }
            });
            
            if (placesResponse.status === 200 && placesResponse.data.status === Status.OK) {
                let places: Place[] = [];

                places.push(...placesResponse.data.results);
                
                if (placesResponse.data.next_page_token) {

                    //Need to sleep for a couple of seconds because the page token is not ready...
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const morePlacesResponse = await this.placesProvider.placesNearby({
                        params: {
                            location: [51.083986, -114.130609],  //VMG office,
                            pagetoken: placesResponse.data.next_page_token,
                            key: process.env.MAPS_API_KEY
                        }
                    });
    
                    if (morePlacesResponse.status === 200 && morePlacesResponse.data.status === Status.OK) {
                        places.push(...morePlacesResponse.data.results);
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

}

export interface PollOptionFactory {

    build(numberOfOptions?: number, keyword?: string) : Promise<PollOption[]>

}