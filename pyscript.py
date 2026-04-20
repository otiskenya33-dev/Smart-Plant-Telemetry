"""
   this script does basic statistical analysis on the data it gets from the the thingsspeak
   api like: count, man, std(standard deviation), mimimum value, maximum value and so on 

   
"""

import requests
import pandas as pd
import json
from datetime import datetime
channelID = 3321220
def fetch_thingspeak_data_simple(channel_id, api_key=None, results=100):
    """Fetch data using only requests library"""
    channelID = 3321220
    api_key = "AAN97TR1HU85UFRF"
    # Build URL
    if api_key:
        url = f"https://api.thingspeak.com/channels/{channelID}/feeds.json?api_key={api_key}&results={results}"
    else:
        url = f"https://api.thingspeak.com/channels/{channelID}/feeds.json?results={results}"
    
    # Fetch data
    response = requests.get(url)
    data = response.json()
    
    # Convert to DataFrame
    df = pd.DataFrame(data['feeds'])
    
    # Convert timestamp
    df['created_at'] = pd.to_datetime(df['created_at'])
    df.set_index('created_at', inplace=True)
    
    # Save to CSV
    filename = f"thingspeak_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    df.to_csv(filename)
    print(f"Data saved to {filename}")
    
    return df

# Usage
df = fetch_thingspeak_data_simple(channel_id=channelID, results=500)
print(df.describe())  # Basic statistics