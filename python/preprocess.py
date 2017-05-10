#!/usr/bin/python
#
# This example shows how to use the MITIE Python API to perform named entity
# recognition and also how to run a binary relation detector on top of the
# named entity recognition outputs.
#
import sys
import glob
from pprint import pprint
import os
import simplejson
import copy
import re
from nltk.stem import WordNetLemmatizer
from pycorenlp import StanfordCoreNLP
from pymongo import MongoClient
from nltk.corpus import stopwords

stop = stopwords.words("english")
client = MongoClient('localhost',27017)
db = client['DIC']
collectipn = db['Tweet']
new_collection = db['Tweet_Processed']

lemmatizer = WordNetLemmatizer()

nlp = StanfordCoreNLP('http://localhost:9000')

def splitHashtags(tweet):
    hashtag = []
    for hashtags in tweet['object']['entities']['hashtags']:
        # a = re.findall('[A-Z][^A-Z]*', hashtags['text'])
        tweet['processed_text'] = tweet['processed_text'].replace('#'+hashtags['text'],hashtags['text'])
        hashtag.append('#'+hashtags['text'])
    tweet['hashtags'] = hashtag
    return tweet

def removeUrls(tweet):
    url = []
    for urls in tweet['object']['entities']['urls']:
        tweet['processed_text'] = tweet['processed_text'].replace(urls['url'],' ')
        url.append(urls['url'])
    tweet['urls'] = url
    return tweet

def convertMentionToName(tweet):
    mentions = []
    for mention in tweet['object']['entities']['user_mentions']:
        tweet['processed_text'] = tweet['processed_text'].replace("@"+mention['screen_name'],mention['name'])
        mentions.append("@"+mention['screen_name'])
    tweet['mentions'] = mentions
    return tweet

def removeExtraWhiteSpaces(tweet):
    tweet['processed_text'] = ' '.join(tweet['processed_text'].replace("\t"," ").replace("\n"," ").replace("\r"," ").split())
    return tweet

def extraProcessing(tweet):
    temp = {}
    temp['text'] = tweet['object']['text']
    temp['hashtags'] = tweet['hashtags']
    temp['mentions'] = tweet['mentions']
    temp['urls'] = tweet['urls']
    temp['username'] = tweet['actor']['twitter_username']
    temp['name'] = tweet['actor']['name']
    temp['displaypic'] = tweet['actor']['profile_image_url']
    temp['processed_text'] = tweet['processed_text']
    temp['league_twitter_name'] = tweet['league_twitter_name']
    temp['parent_name'] = tweet['actor']['parent_name']
    if 'place' in tweet['object'] and tweet['object']['place'] is not None and 'country' in tweet['object']['place']:
        temp['place'] = tweet['object']['place']['country']

    temp['processed_text'] = " ".join(tweet['processed_text'].split())
    temp['processed_text_list'] = [i for i in tweet['processed_text'].split() if (i.lower() not in stop and not i.isdigit() and len(i) > 3)]
    temp['date'] = tweet['date']
    temp['lang'] = tweet['object']['lang']
    temp['favorite_count'] = tweet['object']['favorite_count']
    if 'source' in tweet['object'] and 'nofollow\">' in tweet['object']['source']:
        temp['source'] = tweet['object']['source'].split('nofollow\">')[1].split("</a>")[0]
    return temp


def getEntities(response):
    # print simplejson.dumps(response)

    ners = []
    relations = []
    sentiment = []
    for sent in response['sentences']:
        sentiment.append(sent['sentiment'])

    return sentiment

def removeUnencodedObjects(text):
    return str(re.sub(r'[\x80-\xff]+', " ", text.encode("utf8")))


def preprocess(tweet):

    tweet['processed_text'] = copy.copy(tweet['object']['text'])
    tweet = convertMentionToName(tweet)
    tweet = removeUrls(tweet)
    tweet = splitHashtags(tweet)
    tweet['processed_text'] = removeUnencodedObjects(tweet['processed_text'])
    tweet = removeExtraWhiteSpaces(tweet)
    tweet = extraProcessing(tweet)

    response = nlp.annotate(tweet['processed_text'], properties={'annotators': 'sentiment', 'outputFormat': 'json'})
    tweet['sentiment'] = getEntities(response)

    # exit(0)

    return tweet


def main():
    counter = 0
    tweet_list = []
    # new_tweet_file = open("processed-tweets.json","r+")
    # new_tweet_file.seek(0,2)
    for tweet in collectipn.find({'type':'Tweet','league_twitter_name':{'$exists':1}}).skip(245000):
        tweet = preprocess(tweet)
        tweet_list.append(tweet)
        if len(tweet_list) % 1000 == 0:
            counter += 1
            # print simplejson.dumps(tweet)
            # exit(0)
            new_collection.insert(tweet_list)
            tweet_list = []
            print "Tweets uploaded ", counter*1000
        # counter += 1
        # if counter % 1000 == 0:
        #     print counter
        # new_tweet_file.write(simplejson.dumps(tweet)+"\n")

if __name__ == "__main__":
    main()