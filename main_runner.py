# main_runner.py
import os
from Primary_Check import PrimaryCheck
from Secondary_Check import SecondaryCheck


def main():
    try:
        print("\nInitializing Face Detection System...")
        primary_checker = PrimaryCheck()
        secondary_checker = SecondaryCheck()
        target = "target.jpg"

        if not os.path.exists(target):
            raise Exception("Target image not found")

        # Run primary check first
        found, similarity = primary_checker.check(target)
        if found:
            print("\n✅ Match found in primary check!")
            return

        # If no primary match, run secondary check
        print("\nNo primary match found, proceeding to secondary check...")
        found, similarity = secondary_checker.check(target)

        if found:
            print("\n✅ Match found in secondary check!")
        else:
            print("\n❌ No match found in either check")

    except Exception as e:
        print(f"\nCritical error: {str(e)}")


if __name__ == "__main__":
    main()
