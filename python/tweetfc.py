import requests
from pprint import pprint
from pymongo import MongoClient
import json
from datetime import datetime

client = MongoClient('localhost', 27017)
collection = client['DIC']['Tweet']


comp_link = 'http://www.tweetsfc.com/api/v1/competitions?sport_id=soccer'
team_link = 'http://www.tweetsfc.com/api/v1/teams?competition_id=%s&has_profile=true'
players_link = 'http://www.tweetsfc.com/api/v1/activities?home_timeline_for=%s&page=%s'

tags = {}
maps = {}
teamss = {}

twitter_names = set()

def getAllData():
	a = requests.get(comp_link)

	if a.status_code == 200:
		comps = a.json()

		for comp in comps['competitions']:
			cid = comp['slug']

			maps[cid] = comp
			comp['type'] = 'League'

			tags[cid] = [comp['twitter_username']]

			twitter_names.add(comp['twitter_username'])

			# print maps[cid]
			collection.insert(comp)
			# print tags[cid]

			a = requests.get(team_link % cid)

			if a.status_code == 200:
				teams = a.json()

				for team in teams['teams']:

					team['type'] = 'Team'

					collection.insert(team)

					pno = 1

					while True:

						print players_link % (team['slug'],pno)

						a = requests.get(players_link % (team['slug'],pno))

						if a.status_code == 200:

							tweets = a.json()

							if len(tweets['activities']) == 0:
								break

							for tweet in tweets['activities']:
								tweet['type'] = 'Tweet'

								collection.insert(tweet)

							pno += 1


# leagues = collection.distinct('slug',{'type':'League', 'twitter_username':{'$ne':None}})
# main = {}

# for league in leagues:
# 	leagueTwitter = collection.find_one({'slug':league})['name']
# 	main[leagueTwitter] = collection.distinct('twitter_username',{'type':'Team', 'twitter_username':{'$ne':None}, 'parent_slug':league})
# 	temp = []
# 	for team in main[leagueTwitter]:
# 		# print team
# 		teamTwitter = collection.find_one({'twitter_username':team})['slug']
# 		temp += collection.distinct('actor.twitter_username',{'type':'Tweet','actor.twitter_username':{'$ne':None},'actor.parent_slug':teamTwitter})
# 	main[leagueTwitter] += temp
# 	main[leagueTwitter] += [leagueTwitter]

# reverse_main = {}
# for key, value in main.iteritems():
# 	for val in value:
# 		if val != key:
# 			print collection.update({'$or':[{'twitter_username':val},{'actor.twitter_username':val}]},{'$set':{'league_twitter_name':key}}, multi=True)

times = collection.aggregate([
	{'$match':{'type':'Tweet'}},
	{'$project':{"_id":"$_id", "published_at":"$published_at"}}])

count = 0
for time in times:
	date = datetime.strptime(time['published_at'],"%Y-%m-%dT%H:%M:%S.000z")
	collection.update({'_id':time['_id']}, {'$set':{'date':date}})
	count += 1
	if count % 1000 == 0:
		print count



