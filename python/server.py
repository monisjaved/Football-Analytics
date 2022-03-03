from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
import simplejson
from pymongo import MongoClient
from datetime import datetime

client = MongoClient('localhost',27017)
collection = client['DIC']['Tweet_Processed']

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route("/", methods=['POST','GET'])
@cross_origin()
def hello():
    data = simplejson.loads(request.data)
    startDate = datetime.strptime(data['startDate'],"%Y-%m-%dT%H:%M:%S")
    endDate = datetime.strptime(data['endDate'],"%Y-%m-%dT%H:%M:%S")
    leagues = data['leagues']
    return jsonify({'name':'Moonis Javed', 'age':21, 'results':getWordCloud(startDate,endDate, leagues), 'sankey':getFlareData(startDate,endDate, leagues), 
    				'tweets':getTopTweets(startDate,endDate, leagues), 'stacked':getCountryWiseData(startDate,endDate, leagues), 
    				'places': getPlaces(startDate, endDate, leagues)})

def getWordCloud(startDate, endDate, leagues):
	results = collection.aggregate([
			{"$match":{"league_twitter_name":{"$exists":1}, "date": {"$gte":startDate, "$lte":endDate}, "league_twitter_name": {"$in":leagues}}},
		    {'$unwind':'$processed_text_list'},
		    {'$group': {'_id': '$processed_text_list' , 'value':{'$sum':1}}},
		    {'$project':{'key':'$_id','value':'$value','_id':0}},
		    {'$sort':{"value":-1}},
		    {'$limit':1000}
		   ]) 
	return list(results)

def getCountryWiseData(startDate, endDate, leagues):
	# results = collection.aggregate([
	# 	{"$match":{"league_twitter_name":{"$exists":1},"sentiment":{"$exists":1}, "date": {"$gte":startDate, "$lte":endDate}, "league_twitter_name": {"$in":leagues}}},
	# 	{"$unwind":"$sentiment"},
	# 	{"$group":{"_id":{"league":"$league_twitter_name","place":"$sentiment"}, "count":{"$sum":1}}},
	# 	{"$project":{"league":"$_id.league","place":"$_id.place","_id":0,"count":1}},
	# 	{"$sort":{"league":1,"sentiment":-1,"count":-1}}
	# ])
	places = ['Twitter for iPhone', 'Instagram', 'Twitter Web Client', 'Twitter for Android', 'Facebook', 'Hootsuite', 'TweetDeck', 'Mobile Web (M5)', 'IFTTT', 'iOS']
	results = collection.aggregate([
		{"$match":{"league_twitter_name":{"$exists":1},"source":{"$in":places}, "date": {"$gte":startDate, "$lte":endDate}, "league_twitter_name": {"$in":leagues}}},
		{"$group":{"_id":{"league":"$league_twitter_name","place":"$source"}, "count":{"$sum":1}}},
		{"$project":{"league":"$_id.league","place":"$_id.place","_id":0,"count":1}},
		{"$sort":{"league":1,"sentiment":-1,"count":-1}}
		])

	leagues = {}
	# places = []
	for result in results:
		if result['league'] not in leagues:
			leagues[result['league']] = {'league':result['league'], 'total':0}
		leagues[result['league']][result['place']] = result['count']
		leagues[result['league']]['total'] += result['count']
		if result['place'] not in places:
			places.append(result['place'])

	return {'league':leagues.values(),'places':places}



def getPlaces(startDate, endDate, leagues):
	results = collection.aggregate([
		{"$match":{"league_twitter_name":{"$exists":1},"place":{"$exists":1}, "date": {"$gte":startDate, "$lte":endDate}, "league_twitter_name": {"$in":leagues}}},
		{"$group":{"_id":"$place", "count":{"$sum":1}}},
        {"$sort":{"count":-1}},
        {"$limit":10},
        {"$project":{"key":"$_id","value":"$count","_id":0}}
	])

	return list(results)


def getTopTweets(startDate,endDate, leagues):
	results = collection.aggregate([
		{"$match":{"league_twitter_name":{"$exists":1}, "date": {"$gte":startDate, "$lte":endDate}, "league_twitter_name": {"$in":leagues}}},
		{"$sort": {"favorite_count":-1}},
		{"$limit":30},
		{"$project":{"_id":0}}
	])
	return list(results)

def getFlareData(startDate, endDate, leagues):
	print startDate,endDate
	nodes = [{'name':'ALL'}]
	links = []
	count = 1
	results = collection.aggregate([
			{"$match":{"league_twitter_name":{"$exists":1}, "sentiment":{"$exists":1}, "date": {"$gte":startDate, "$lte":endDate}, "league_twitter_name": {"$in":leagues}}},
            {"$unwind":"$sentiment"},
            {"$group":{"_id":{"league":"$league_twitter_name","player":"$name", "team":"$parent_name", "sentiment":"$sentiment"}, "size":{"$sum":1}}},
			{"$sort":{"_id.league":1,"_id.team":1,"_id.player":1}},
			{"$group":{"_id":{"league":"$_id.league","player":"$_id.player", "team":"$_id.team"}, "children":{"$push":{"name":"$_id.sentiment","size":"$size"}}}},
			{"$sort":{"_id.league":1,"_id.team":1,"_id.player":1}},
			{"$group":{"_id":{"league":"$_id.league","team":"$_id.team"}, "size":{"$sum":"$size"}, "children":{"$push":{"name":"$_id.player","size":"$size", "children":"$children"}}}},
			{"$sort":{"_id.league":1,"_id.team":1}},
			{"$group":{"_id":"$_id.league", "size":{"$sum":"$size"}, "children":{"$push":{"name":"$_id.team" , "children":"$children", "size":"$size"}}}},
			{"$sort":{"count":1}},
			{"$project": {"name":"$_id", "_id":0, "children":1}}
			])
	result = {'name':'ALL', 'children':list(results)}
	# for re in results:
	# 	re['name'] = re['_id']
	# 	del re['_id']
	# 	result['children'].append(re)
	
	return result
 
if __name__ == "__main__":
    app.run()

