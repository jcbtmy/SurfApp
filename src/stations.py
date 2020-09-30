import sys

def read_file(filename):

	f = open(filename, "r")
	contents = f.read()
	f.close()

	return contents

def txt_to_xml(contents):
	
	lines = contents.split("\n")
	xml_contents = "<stations>"


	for line in lines:
		station_info = line.split(":")
		xml_contents += '<station name="' + station_info[1] + '" id="' + station_info[0] + '"></station>\n'

	xml_contents += "</stations>"

	return xml_contents


def write_file(filename, file_contents):
	
	f = open(filename, "w+")
	f.write(file_contents)
	f.close()

def main():

	if len(sys.argv) < 2:
		exit(0)

	filename = sys.argv[1]
	xml_filename = filename.split(".")[0] + ".xml"

	file_contents = read_file(filename)
	file_contents = txt_to_xml(file_contents)
	write_file(xml_filename ,file_contents)



if __name__ == "__main__":
	main()

