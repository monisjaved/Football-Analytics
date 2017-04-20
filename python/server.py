from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
import simplejson
app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route("/", methods=['POST','GET'])
@cross_origin()
def hello():
    data = simplejson.loads(request.data)
    count = int(data['count'])
    results = []
    for i in xrange(count):
        results.append({"key":i, "value":i})
    return jsonify({'name':'Moonis Javed', 'age':21, 'results':results})
 
if __name__ == "__main__":
    app.run()